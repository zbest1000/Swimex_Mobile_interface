export interface UILayoutDTO {
    id: string;
    name: string;
    templateId: string;
    isActive: boolean;
    createdBy: string | null;
    widgets: unknown[];
    version: number;
    updatedAt: string;
}
export declare function listLayouts(): UILayoutDTO[];
export declare function getLayout(id: string): UILayoutDTO;
export declare function getActiveLayout(): UILayoutDTO | null;
export declare function createLayout(name: string, templateId: string, widgets: unknown[], createdBy: string): UILayoutDTO;
export declare function updateLayout(id: string, updates: {
    name?: string;
    templateId?: string;
    widgets?: unknown[];
    isActive?: boolean;
}, actorId: string): UILayoutDTO;
export declare function deleteLayout(id: string, actorId: string): void;
export declare function publishLayout(id: string, actorId: string): UILayoutDTO;
//# sourceMappingURL=layout-service.d.ts.map