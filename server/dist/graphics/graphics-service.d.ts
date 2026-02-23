import { GraphicFormat } from '../shared/models';
export interface GraphicAssetDTO {
    id: string;
    name: string;
    category: string;
    tags: string[];
    format: GraphicFormat;
    svgContent: string | null;
    isBuiltIn: boolean;
    version: number;
    elements: GraphicElementDTO[];
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface GraphicElementDTO {
    elementId: string;
    elementType: string;
    displayName: string;
    bindable: boolean;
}
export declare function listGraphics(options?: {
    category?: string;
    search?: string;
    format?: GraphicFormat;
    limit?: number;
    offset?: number;
}): {
    assets: GraphicAssetDTO[];
    total: number;
};
export declare function getGraphic(id: string): GraphicAssetDTO;
export declare function getGraphicFile(id: string): Buffer;
export declare function importGraphic(name: string, category: string, tags: string[], format: GraphicFormat, sourceFile: Buffer, svgContent: string | null, elements: GraphicElementDTO[], createdBy: string): GraphicAssetDTO;
export declare function updateGraphic(id: string, updates: {
    name?: string;
    category?: string;
    tags?: string[];
    svgContent?: string;
    elements?: GraphicElementDTO[];
}, actorId: string): GraphicAssetDTO;
export declare function deleteGraphic(id: string, actorId: string): void;
export declare function parseSvgElements(svgContent: string): GraphicElementDTO[];
export declare function getCategories(): string[];
//# sourceMappingURL=graphics-service.d.ts.map