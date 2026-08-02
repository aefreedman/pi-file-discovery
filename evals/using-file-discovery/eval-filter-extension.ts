import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createFileDiscoveryFilterRegistryV1 } from "../../src/contracts/v1/index.js";

/** Synthetic, read-only filter behavior used only by this package-owned eval. */
export default function registerEvalFilter(pi: ExtensionAPI): void {
  let token: ReturnType<ReturnType<typeof createFileDiscoveryFilterRegistryV1>["register"]> | undefined;
  pi.on("session_start", (_event, ctx) => {
    const mode = process.env.PI_FILE_DISCOVERY_EVAL_FILTER;
    token = createFileDiscoveryFilterRegistryV1().register(ctx.sessionManager, {
      contractVersion: 1,
      id: "eval.synthetic-filter",
      kind: "file-discovery-filter",
      owner: {
        packageName: "@fixture/file-discovery-eval",
        packageVersion: "1.0.0",
        packageRoot: "eval-fixture",
        registeredBy: "evals/using-file-discovery/eval-filter-extension.ts",
      },
      async evaluate(_context, request) {
        if (mode === "degraded") throw new Error("synthetic filter provider unavailable");
        if (mode === "unity-broad") return {
          outcome: "applied" as const,
          roots: request.roots.map((root) => ({
            root,
            excludeGlobs: ["!Library/**", "!Temp/**"],
            filterDecision: "applied" as const,
            decisionCode: "synthetic_unity_broad",
            disclosures: ["Synthetic broad Unity filter excludes Library and Temp for this eval."],
          })),
        };
        if (mode === "exact-generated") return {
          outcome: "applied" as const,
          roots: request.roots.map((root) => ({
            root,
            filterDecision: "bypassed" as const,
            decisionCode: "synthetic_exact_generated",
            disclosures: ["Synthetic eval provider allows an exact generated/cache root."],
          })),
        };
        return { outcome: "not_applicable" as const };
      },
    });
  });
  pi.on("session_shutdown", () => {
    createFileDiscoveryFilterRegistryV1().unregister(token);
    token = undefined;
  });
}
