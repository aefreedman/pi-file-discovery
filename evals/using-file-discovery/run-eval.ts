import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { evaluateCheck } from "./checks.ts";

type Condition = "available" | "baseline";
type Config = { version: 1; skillName: string; skillPath: string; extensionPaths: string[]; allowExtensionExecution: boolean; tools: string[]; allowHostMutation: boolean; conditions: Condition[]; trials: number; timeoutMs: number; maxToolCalls: number; maxAnswerChars: number };
type EvalCase = { id: string; prompt: string; fixture: string; prompt_kind: "explicit" | "implicit" | "contextual" | "negative-control"; should_trigger: boolean; filter_fixture?: "unity-broad" | "exact-generated" | "degraded"; expected_checks: string[] };
type ToolCall = { name: string; args: unknown; result?: unknown; failed: boolean };
type Snapshot = Record<string, string>;

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(await readFile(join(here, "eval.config.json"), "utf8")) as Config;
const cases = JSON.parse(await readFile(join(here, "cases.json"), "utf8")) as EvalCase[];
const packageRoot = resolve(here, "../..");

function fail(message: string): never { throw new Error(message); }
function cliPath(): string {
  const paths = [process.env.PI_CLI_PATH, process.env.APPDATA && join(process.env.APPDATA, "npm/node_modules/@earendil-works/pi-coding-agent/dist/cli.js")].filter((value): value is string => Boolean(value));
  const found = paths.find(existsSync);
  if (!found) fail("Could not resolve Pi CLI. Set PI_CLI_PATH to @earendil-works/pi-coding-agent/dist/cli.js.");
  return found;
}
function validate(): void {
  if (config.version !== 1 || !config.skillName || !config.skillPath) fail("Invalid eval config.");
  if (!config.allowExtensionExecution || config.allowHostMutation) fail("This read-only eval requires reviewed extensions and disallows host mutation.");
  if (!config.tools.includes("read") || !config.tools.includes("discover_candidate_files") || config.tools.some((tool) => ["bash", "edit", "write"].includes(tool))) fail("Tool policy must expose only read and discover_candidate_files.");
  if (!config.conditions.includes("available") || !config.conditions.includes("baseline") || config.trials < 1 || config.trials > 5 || config.timeoutMs < 1_000 || config.maxToolCalls < 1 || config.maxAnswerChars > 8_000) fail("Invalid eval budgets.");
  const ids = new Set<string>();
  for (const item of cases) {
    if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(item.id) || ids.has(item.id) || !item.prompt.trim() || !item.fixture || !item.prompt_kind || typeof item.should_trigger !== "boolean" || !item.expected_checks?.length) fail(`Invalid case: ${item.id}`);
    ids.add(item.id);
    if ((item.prompt_kind === "negative-control") !== !item.should_trigger) fail(`Prompt kind disagrees with trigger expectation: ${item.id}`);
    if (isAbsolute(item.fixture) || item.fixture.split(/[\\/]/).includes("..") || !existsSync(join(here, "fixtures", item.fixture))) fail(`Missing or invalid fixture: ${item.id}`);
  }
}
function parseArgs(args: string[]) {
  let trials = config.trials; let selectedConditions = config.conditions; let ids: string[] = []; let model: string | undefined; let keep = false; let includeRaw = false; let includeEvents = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--trials") trials = Number(args[++index]);
    else if (arg === "--condition") { const value = args[++index]; selectedConditions = value === "all" ? config.conditions : [value as Condition]; }
    else if (arg === "--cases") ids = String(args[++index]).split(",").filter(Boolean);
    else if (arg === "--model") model = args[++index];
    else if (arg === "--keep") keep = true;
    else if (arg === "--include-raw") includeRaw = true;
    else if (arg === "--include-events") includeEvents = true;
    else fail(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(trials) || trials < 1 || trials > 5 || selectedConditions.some((condition) => !config.conditions.includes(condition))) fail("Invalid trial or condition selection.");
  return { trials, selectedConditions, ids, model, keep, includeRaw, includeEvents };
}
async function walk(root: string, current = root): Promise<string[]> { const found: string[] = []; for (const entry of await readdir(current, { withFileTypes: true })) { const path = join(current, entry.name); if (entry.isDirectory()) found.push(...await walk(root, path)); else if (entry.isFile()) found.push(path); } return found; }
async function stableSnapshot(root: string): Promise<Snapshot> { const entries = await Promise.all((await walk(root)).map(async (path) => [relative(root, path).replaceAll("\\", "/"), createHash("sha256").update(await readFile(path)).digest("hex")] as const)); return Object.fromEntries(entries); }
function changed(before: Snapshot, after: Snapshot): string[] { return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((path) => before[path] !== after[path]).sort(); }
function assistantText(message: any): string { return message?.role === "assistant" && Array.isArray(message.content) ? message.content.filter((part: any) => part?.type === "text").map((part: any) => String(part.text ?? "")).join("") : ""; }
function resultText(value: any): string { const payload = value?.result ?? value; const content = payload?.content ?? payload?.result?.content; return Array.isArray(content) ? content.filter((part: any) => part?.type === "text").map((part: any) => String(part.text ?? "")).join("\n") : ""; }
function sanitizeEvent(event: any): Record<string, unknown> { return { type: event?.type, ...(typeof event?.toolName === "string" ? { toolName: event.toolName } : {}), ...(typeof event?.isError === "boolean" ? { isError: event.isError } : {}) }; }

async function runCase(testCase: EvalCase, condition: Condition, trial: number, options: ReturnType<typeof parseArgs>) {
  const workspace = await mkdtemp(join(tmpdir(), `pi-file-discovery-eval-${testCase.id}-${condition}-${trial}-`));
  try {
    await cp(join(here, "fixtures", testCase.fixture), workspace, { recursive: true });
    const before = await stableSnapshot(workspace);
    const skillPath = resolve(here, config.skillPath);
    const args = ["--mode", "json", "--no-session", "--no-approve", "--no-context-files", "--no-extensions", "--no-skills", "--tools", config.tools.join(",")];
    for (const extension of config.extensionPaths) args.push("--extension", resolve(here, extension));
    if (condition === "available") args.push("--skill", skillPath);
    if (options.model) args.push("--model", options.model);
    args.push(testCase.prompt);
    const child = spawn(process.execPath, [cliPath(), ...args], { cwd: workspace, windowsHide: true, env: { ...process.env, PI_FILE_DISCOVERY_EVAL_FILTER: testCase.filter_fixture ?? "" }, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = ""; let outputOverflow = false; let timedOut = false; let streamBytes = 0; let malformed = 0;
    // Keep only outcome-bearing JSON events. Pi can emit repeated provider metadata that is irrelevant to this behavioral evidence.
    const events: any[] = []; const maxStreamBytes = 16_000_000;
    const output = createInterface({ input: child.stdout!, crlfDelay: Infinity });
    output.on("line", (line) => {
      streamBytes += Buffer.byteLength(line) + 1;
      if (streamBytes > maxStreamBytes) { outputOverflow = true; child.kill(); return; }
      try { const event = JSON.parse(line); if (["tool_execution_start", "tool_execution_end", "message_end"].includes(event.type)) events.push(event); } catch { malformed += 1; }
    });
    child.stderr!.setEncoding("utf8"); child.stderr!.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-4_000); });
    const started = Date.now(); const timer = setTimeout(() => { timedOut = true; child.kill(); }, config.timeoutMs);
    const exitCode = await new Promise<number | null>((done) => child.once("close", done)); clearTimeout(timer);
    if (!output.closed) await new Promise<void>((done) => output.once("close", () => done()));
    const ends = new Map(events.filter((event) => event.type === "tool_execution_end").map((event) => [event.toolCallId, event]));
    const calls: ToolCall[] = events.filter((event) => event.type === "tool_execution_start").map((event) => { const end = ends.get(event.toolCallId); return { name: String(event.toolName), args: event.args, result: { result: end?.result, content: end?.content }, failed: Boolean(end?.isError) }; });
    const final = events.filter((event) => event.type === "message_end" && event.message?.role === "assistant").at(-1)?.message;
    const answer = assistantText(final); const after = await stableSnapshot(workspace);
    const skillFileRead = calls.some((call) => call.name === "read" && JSON.stringify(call.args).replaceAll("\\", "/") === JSON.stringify({ path: skillPath }).replaceAll("\\", "/"));
    const context = { answer, toolCalls: calls, changedPaths: changed(before, after), condition, skillFileRead, maxToolCalls: config.maxToolCalls, maxAnswerChars: config.maxAnswerChars, resultText, resultJson: (call: ToolCall) => JSON.stringify(call.result ?? {}), exitCode, timedOut, outputOverflow, malformed };
    const checks = Object.fromEntries(testCase.expected_checks.map((id) => [id, evaluateCheck(id, context)]));
    const values = Object.values(checks).filter((value): value is boolean => value !== null);
    const result = { id: testCase.id, condition, trial, promptKind: testCase.prompt_kind, shouldTrigger: testCase.should_trigger, passed: exitCode === 0 && !timedOut && !outputOverflow && malformed === 0 && values.length > 0 && values.every(Boolean), checks, observations: { skillAvailable: condition === "available", skillFileRead, timedOut, outputOverflow, malformedEventLines: malformed, toolErrors: calls.filter((call) => call.failed).length }, metrics: { durationMs: Date.now() - started, toolCalls: calls.length, changedPaths: context.changedPaths, answerChars: answer.length, exitCode }, ...(options.includeRaw ? { finalAnswer: answer.slice(0, 8_000), stderr: stderr.slice(-4_000) } : {}), ...(options.includeEvents ? { eventTrace: events.slice(0, 100).map(sanitizeEvent) } : {}), workspace: options.keep ? workspace : undefined };
    return result;
  } finally { if (!options.keep) await rm(workspace, { recursive: true, force: true }); }
}

validate();
const options = parseArgs(process.argv.slice(2));
const selected = options.ids.length ? cases.filter((item) => options.ids.includes(item.id)) : cases;
if (!selected.length || selected.length !== new Set(options.ids).size && options.ids.length) fail("One or more selected case IDs do not exist.");
const results: any[] = [];
for (const testCase of selected) for (const condition of options.selectedConditions) for (let trial = 1; trial <= options.trials; trial += 1) { process.stderr.write(`Running ${testCase.id} [${condition}] trial ${trial}...\n`); results.push(await runCase(testCase, condition, trial, options)); }
const summary = { passed: results.filter((result) => result.passed).length, total: results.length, byCondition: Object.fromEntries(options.selectedConditions.map((condition) => { const rows = results.filter((result) => result.condition === condition); return [condition, { passed: rows.filter((result) => result.passed).length, total: rows.length }]; })) };
const report = { generatedAt: new Date().toISOString(), config: { ...config, extensionPaths: config.extensionPaths }, options: { ...options, model: options.model ? "configured" : undefined, keep: undefined, includeRaw: undefined, includeEvents: undefined }, summary, results };
const outputPath = join(here, "latest-results.json"); const temporary = join(here, `.latest-results.tmp-${process.pid}-${Date.now()}.json`);
try { await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 }); await rename(temporary, outputPath); } finally { await rm(temporary, { force: true }); }
console.log(JSON.stringify({ outputPath, ...summary }, null, 2));
