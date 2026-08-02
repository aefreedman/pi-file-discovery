import type { FileDiscoveryExecutionContextV1, FileDiscoveryFilterV1, FileDiscoveryRequestV1, FileDiscoveryServiceV1 } from "./index.js";
import { assertFileDiscoveryExecutionContextV1, assertFileDiscoveryFilterResultV1, assertFileDiscoveryResultV1 } from "./index.js";

/** Small reusable probes for independently implemented v1 services and filters. */
export async function assertFileDiscoveryServiceConformanceV1(service: FileDiscoveryServiceV1, request: FileDiscoveryRequestV1): Promise<void> {
  const controller = new AbortController(); const context: FileDiscoveryExecutionContextV1 = Object.freeze({ cwd: process.cwd(), signal: controller.signal }); assertFileDiscoveryExecutionContextV1(context); assertFileDiscoveryResultV1(await service.search(context, request));
}
export async function assertFileDiscoveryFilterConformanceV1(filter: FileDiscoveryFilterV1, request: Omit<Parameters<FileDiscoveryFilterV1["evaluate"]>[1], "signal">): Promise<void> {
  const controller = new AbortController(); const context: FileDiscoveryExecutionContextV1 = Object.freeze({ cwd: process.cwd(), signal: controller.signal }); assertFileDiscoveryFilterResultV1(await filter.evaluate(context, Object.freeze({ ...request, signal: controller.signal })));
}
