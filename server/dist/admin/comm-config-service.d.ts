import { Protocol } from '../shared/models';
export interface CommConfigDTO {
    id: string;
    protocol: Protocol;
    name: string;
    isActive: boolean;
    config: Record<string, unknown>;
    createdBy: string | null;
    updatedAt: string;
}
export declare function listConfigs(protocol?: Protocol): CommConfigDTO[];
export declare function getConfig(id: string): CommConfigDTO;
export declare function createConfig(protocol: Protocol, name: string, configData: Record<string, unknown>, createdBy: string): CommConfigDTO;
export declare function updateConfig(id: string, updates: {
    name?: string;
    isActive?: boolean;
    config?: Record<string, unknown>;
}, actorId: string): CommConfigDTO;
export declare function deleteConfig(id: string, actorId: string): void;
//# sourceMappingURL=comm-config-service.d.ts.map