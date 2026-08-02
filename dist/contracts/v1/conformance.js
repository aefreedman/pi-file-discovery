import { assertFileDiscoveryExecutionContextV1, assertFileDiscoveryFilterResultV1, assertFileDiscoveryResultV1 } from "./index.js";
/** Small reusable probes for independently implemented v1 services and filters. */
export async function assertFileDiscoveryServiceConformanceV1(service, request) {
    const controller = new AbortController();
    const context = Object.freeze({ cwd: process.cwd(), signal: controller.signal });
    assertFileDiscoveryExecutionContextV1(context);
    assertFileDiscoveryResultV1(await service.search(context, request));
}
export async function assertFileDiscoveryFilterConformanceV1(filter, request) {
    const controller = new AbortController();
    const context = Object.freeze({ cwd: process.cwd(), signal: controller.signal });
    assertFileDiscoveryFilterResultV1(await filter.evaluate(context, Object.freeze({ ...request, signal: controller.signal })));
}
//# sourceMappingURL=conformance.js.map