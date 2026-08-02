import { type FileDiscoveryExecutionContextV1, type FileDiscoveryOwnerV1, type FileDiscoveryServiceV1 } from "./contracts/v1/index.js";
export declare const DISCOVER_CANDIDATE_FILES_TOOL_NAME: "discover_candidate_files";
export declare const FILE_DISCOVERY_SERVICE_ID: "file-discovery.ripgrep";
export declare const FILE_DISCOVERY_PACKAGE_NAME: "@aefree/pi-file-discovery";
export declare function loadFileDiscoveryOwnerV1(moduleUrl?: string): Promise<FileDiscoveryOwnerV1>;
export declare function createFileDiscoveryServiceV1(owner?: FileDiscoveryOwnerV1): Promise<FileDiscoveryServiceV1>;
export declare function bindFileDiscoveryScopeV1(context: FileDiscoveryExecutionContextV1, scope: object): FileDiscoveryExecutionContextV1;
//# sourceMappingURL=service.d.ts.map