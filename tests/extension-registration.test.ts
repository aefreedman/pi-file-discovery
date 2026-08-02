import assert from "node:assert/strict";
import register from "../extensions/index.ts";
import { createFileDiscoveryServiceRegistryV1 } from "../src/contracts/v1/index.ts";

type Handler = (_event: unknown, context: any) => Promise<void> | void;
const tools = new Map<string, any>(); const handlers = new Map<string, Handler[]>();
register({ registerTool: (tool: any) => tools.set(tool.name, tool), on: (event: string, handler: Handler) => handlers.set(event, [...(handlers.get(event) ?? []), handler]) } as any);
assert.equal(tools.has("discover_candidate_files"), true);
const tool = tools.get("discover_candidate_files"); const schema = tool.parameters; const serialized = JSON.stringify(schema); assert.deepEqual(schema.properties.queries.items.properties.mode.enum, ["literal", "regex"]); assert.deepEqual(schema.properties.filterMode.enum, ["recommended", "native-only"]); assert.equal(serialized.includes("anyOf"), false); assert.equal(serialized.includes("const"), false); assert.match(tool.description, /not a sandbox, permission system, or access-control boundary/i); assert(tool.promptGuidelines.some((guideline: string) => /do not control agent access/i.test(guideline)));
const scope = {}; const context = { cwd: process.cwd(), sessionManager: scope };
for (const handler of handlers.get("session_start") ?? []) await handler({}, context);
assert.equal(createFileDiscoveryServiceRegistryV1().snapshotCompatible(scope).length, 1);
for (const handler of handlers.get("session_shutdown") ?? []) await handler({}, context);
assert.equal(createFileDiscoveryServiceRegistryV1().snapshotCompatible(scope).length, 0);
console.log("PASS: discover_candidate_files registration");
