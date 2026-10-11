import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import { createAgentSession, createCodemodeExtension, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// Deterministic scripted local model only; no provider/network calls, user resources or real sessions.
const root = await mkdtemp(path.join(os.tmpdir(), "discovery-host-"));
const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
let nextCall: { name: string; arguments: any } | undefined;
let hookMode: "none" | "drop" | "alter" | "block" = "none";
const events: any[] = []; const nested: any[] = [];
let session: any;
try {
  await writeFile(path.join(root, "雪.txt"), "needle Unicode 雪\n");
  const settingsManager = SettingsManager.inMemory({ defaultTools: ["discover_candidate_files", "codemode", "nested_fixture", "throws_fixture"], compaction: { enabled: false }, retry: { enabled: false } });
  const modelRuntime = await ModelRuntime.create({ authPath: path.join(root, "auth.json"), modelsPath: null, modelsStorePath: path.join(root, "models-cache.json"), refreshOnCreate: false, allowModelNetwork: false });
  modelRuntime.registerProvider("local-script", { api: "local-script", apiKey: "fixture-only", baseUrl: "http://invalid.local", models: [{ id: "script", name: "Local Script", api: "local-script", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 100000, maxTokens: 1000 }],
    streamSimple(model: any) {
      const stream = createAssistantMessageEventStream();
      const call = nextCall; nextCall = undefined;
      const message: any = { role: "assistant", content: [], api: model.api, provider: model.provider, model: model.id, usage, stopReason: "pending", timestamp: Date.now() };
      queueMicrotask(() => {
        stream.push({ type: "start", partial: message });
        if (call) {
          const block = { type: "toolCall" as const, id: `fixture-${events.length}`, name: call.name, arguments: call.arguments };
          message.content.push(block);
          stream.push({ type: "toolcall_start", contentIndex: 0, partial: message });
          stream.push({ type: "toolcall_end", contentIndex: 0, toolCall: block, partial: message }); message.stopReason = "toolUse";
        } else { message.content.push({ type: "text", text: "fixture complete" }); message.stopReason = "stop"; }
        stream.push({ type: "done", reason: message.stopReason, message }); stream.end();
      }); return stream;
    },
  });
  const resourceLoader = new DefaultResourceLoader({ cwd: root, agentDir: path.join(root, "agent"), settingsManager, additionalExtensionPaths: [path.resolve("extensions/index.ts")], noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
    extensionFactories: [createCodemodeExtension({ mode: "on" }), (pi) => {
      pi.registerTool({ name: "nested_fixture", label: "Nested", description: "Fixture", parameters: Type.Object({}), async execute(_id, _params, _signal, _update, ctx) {
        const outcome = await ctx.executeTool("discover_candidate_files", { queries: [{ pattern: "needle", mode: "literal" }] }); nested.push(outcome);
        return { content: [{ type: "text", text: JSON.stringify({ isError: outcome.isError, ok: (outcome.result.structuredContent as any)?.ok }) }], details: undefined };
      } });
      pi.registerTool({ name: "throws_fixture", label: "Throws", description: "Fixture", parameters: Type.Object({}), async execute() { throw new Error("fixture no DTO"); } });
      pi.on("tool_call", event => { if (event.toolName === "discover_candidate_files" && hookMode === "block") return { block: true, reason: "fixture block" }; });
      pi.on("tool_result", event => {
        if (event.toolName !== "discover_candidate_files") return;
        if (hookMode === "drop") return { content: [{ type: "text", text: "fixture redacted" }] };
        if (hookMode === "alter") return { structuredContent: { hookOwned: true } };
      });
    }] });
  await resourceLoader.reload(); assert.deepEqual(resourceLoader.getExtensions().errors, []);
  ({ session } = await createAgentSession({ cwd: root, modelRuntime, model: modelRuntime.getModel("local-script", "script")!, settingsManager, resourceLoader, sessionManager: SessionManager.inMemory(root), tools: ["discover_candidate_files", "codemode", "nested_fixture", "throws_fixture"] }));
  await session.bindExtensions({});
  session.subscribe((e: any) => { events.push(JSON.parse(JSON.stringify(e))); });
  async function run(name: string, args: any) {
    const before = events.length; nextCall = { name, arguments: name === "codemode" ? { code: args } : args }; await session.prompt("Execute only the scripted fixture.");
    const event = events.slice(before).find(e => e.type === "tool_execution_end" && e.toolName === name && !e.parentToolCallId);
    assert(event, `missing final execution event for ${name}`); return event;
  }
  const direct = await run("discover_candidate_files", { queries: [{ pattern: "needle", mode: "literal", caseSensitive: false }] });
  assert.equal(direct.isError, false, JSON.stringify(direct)); assert.match(direct.result.content[0].text, /雪.txt/); assert.equal(direct.result.structuredContent.ok, true);
  assert.equal(direct.result.structuredContent.observation.queries[0].caseSensitive, false);
  assert.equal(direct.result.structuredContent.observation.candidates[0].path, "雪.txt");
  const outputText = (event: any) => event.result.content.map((c: any) => c.text ?? "").join("\n");
  const code = await run("codemode", 'const r = await tools.discover_candidate_files({queries:[{pattern:"needle",mode:"literal"}]}); text({ok:r.ok,paths:r.observation.candidates.map(c=>c.path)});');
  assert.equal(code.isError, false, JSON.stringify(code)); assert.match(outputText(code), /"paths":\["雪.txt"\]/); assert.doesNotMatch(outputText(code), /workspaceRoot/);
  const typed = await run("codemode", 'text(await describeTool("discover_candidate_files"));');
  assert.match(outputText(typed), /observation/); assert.match(outputText(typed), /candidates/);
  await run("nested_fixture", {}); assert.equal(nested[0].isError, false); assert.equal(nested[0].result.structuredContent.ok, true); assert.equal("ok" in nested[0], false, "host outcome is not the native DTO");
  const failed = await run("discover_candidate_files", { queries: [{ pattern: "[", mode: "regex" }] });
  assert.equal(failed.isError, true); assert.equal(failed.result.structuredContent.ok, false); assert.equal(failed.result.structuredContent.error.code, "all_failed");
  assert.equal(failed.result.structuredContent.observation.cells[0].status, "invalid_regex");
  const resolved = await run("codemode", 'const r = await tools.discover_candidate_files({queries:[{pattern:"[",mode:"regex"}]}); text({ok:r.ok,code:r.error.code});');
  assert.equal(resolved.isError, false); assert.match(outputText(resolved), /"ok":false/);
  const rejected = await run("codemode", 'try { await tools.throws_fixture({}); } catch(e) { text("rejected no DTO"); }');
  assert.match(outputText(rejected), /rejected no DTO/);
  const invalid = await run("codemode", 'try { await tools.discover_candidate_files({queries:[]}); } catch(e) { text("rejected validation"); }');
  assert.match(outputText(invalid), /rejected validation/);
  hookMode = "block";
  const blocked = await run("codemode", 'try { await tools.discover_candidate_files({queries:[{pattern:"needle",mode:"literal"}]}); } catch(e) { text("rejected block"); }'); assert.match(outputText(blocked), /rejected block/);
  hookMode = "alter";
  const altered = await run("discover_candidate_files", { queries: [{ pattern: "needle", mode: "literal" }] }); assert.deepEqual(altered.result.structuredContent, { hookOwned: true });
  hookMode = "drop";
  const dropped = await run("discover_candidate_files", { queries: [{ pattern: "needle", mode: "literal" }] }); assert.equal(dropped.result.structuredContent, undefined); assert.equal(dropped.result.content[0].text, "fixture redacted");
  const persisted = session.sessionManager.getEntries().filter((e: any) => e.type === "message" && e.message.role === "toolResult");
  assert(persisted.length > 0); assert(persisted.every((e: any) => e.message.structuredContent === undefined));
  assert(persisted.every((e: any) => e.message.details?.structuredContent === undefined));
  const runtime = JSON.parse(await readFile(path.resolve("node_modules/@earendil-works/pi-coding-agent/package.json"), "utf8")).version;
  console.log(`PASS: actual Pi ${runtime} host: direct, codemode typed/selective, nested outcomes, structured failures, rejection, hooks, serialized final events and transcript boundary`);
} finally { session?.dispose(); await rm(root, { recursive: true, force: true }); }
