import { EventEmitter } from 'events';
export interface TagValue {
    value: unknown;
    quality: 'good' | 'bad' | 'uncertain';
    timestamp: number;
    source: string;
}
export interface TagDefinition {
    address: string;
    dataType: string;
    accessMode: string;
    scaleFactor: number;
    offset: number;
    description?: string;
}
/**
 * Unified Tag Database — single source of truth for all protocol data.
 * MQTT topics, Modbus registers, and HTTP endpoints all read/write through this store.
 */
export declare class TagDatabase extends EventEmitter {
    private tags;
    private definitions;
    registerTag(address: string, definition: TagDefinition): void;
    unregisterTag(address: string): void;
    getDefinition(address: string): TagDefinition | undefined;
    getAllDefinitions(): Map<string, TagDefinition>;
    writeTag(address: string, value: unknown, source: string): void;
    readTag(address: string): TagValue | undefined;
    readTagValue(address: string): unknown;
    readAllTags(): Map<string, TagValue>;
    getTagAddresses(): string[];
    setTagQuality(address: string, quality: 'good' | 'bad' | 'uncertain', source: string): void;
    clear(): void;
}
export declare const tagDatabase: TagDatabase;
//# sourceMappingURL=tag-database.d.ts.map