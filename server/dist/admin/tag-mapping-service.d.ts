import { Protocol, DataType, AccessMode } from '../shared/models';
export interface TagMappingDTO {
    id: string;
    objectId: string;
    objectName: string;
    tagAddress: string;
    protocol: Protocol;
    dataType: DataType;
    accessMode: AccessMode;
    scaleFactor: number;
    offset: number;
    createdBy: string | null;
    updatedAt: string;
}
export declare function listMappings(): TagMappingDTO[];
export declare function getMapping(id: string): TagMappingDTO;
export declare function createMapping(objectId: string, objectName: string, tagAddress: string, protocol: Protocol, dataType: DataType, accessMode: AccessMode, scaleFactor: number, offset: number, createdBy: string): TagMappingDTO;
export declare function updateMapping(id: string, updates: Partial<{
    objectName: string;
    tagAddress: string;
    dataType: DataType;
    accessMode: AccessMode;
    scaleFactor: number;
    offset: number;
}>, actorId: string): TagMappingDTO;
export declare function deleteMapping(id: string, actorId: string): void;
//# sourceMappingURL=tag-mapping-service.d.ts.map