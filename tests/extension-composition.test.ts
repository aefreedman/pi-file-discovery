import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import register from "../extensions/index.ts";

type Handler = (_event: unknown, context: any) => Promise<void> | void;
const root = await mkdtemp(path.join(os.tmpdir(), "pi-file-discovery-composition-"));
try {
  await writeFile(path.join(root, "fixture.txt"), "discovery fixture\n"); const tools = new Map<string, any>(); const handlers = new Map<string, Handler[]>(); const pi = { registerTool: (tool: any) => tools.set(tool.name, tool), on: (event: string, handler: Handler) => handlers.set(event, [...(handlers.get(event) ?? []), handler]) };
  register(pi as any); const context = { cwd: root, sessionManager: {} }; for (const handler of handlers.get("session_start") ?? []) await handler({}, context);
  const result = await tools.get("discover_candidate_files").execute("test", { queries: [{ pattern: "discovery fixture", mode: "literal" }] }, new AbortController().signal, undefined, context);
  assert.equal(result.details.completeness, "complete"); assert.match(result.content[0].text, /fixture.txt/); for (const handler of handlers.get("session_shutdown") ?? []) await handler({}, context);
} finally { await rm(root, { recursive: true, force: true }); }
console.log("PASS: File Discovery extension composition");
