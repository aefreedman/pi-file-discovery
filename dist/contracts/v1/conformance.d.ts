import type { FileDiscoveryFilterV1, FileDiscoveryRequestV1, FileDiscoveryServiceV1 } from "./index.js";
/** Small reusable probes for independently implemented v1 services and filters. */
export declare function assertFileDiscoveryServiceConformanceV1(service: FileDiscoveryServiceV1, request: FileDiscoveryRequestV1): Promise<void>;
export declare function assertFileDiscoveryFilterConformanceV1(filter: FileDiscoveryFilterV1, request: Omit<Parameters<FileDiscoveryFilterV1["evaluate"]>[1], "signal">): Promise<void>;
//# sourceMappingURL=conformance.d.ts.map