import { EventEmitter } from 'events';
interface TagMapping {
    tagAddress: string;
    protocol: string;
    modbusRegister?: number;
    mqttTopic?: string;
    httpEndpoint?: string;
}
/**
 * Internal Data Bridge — synchronizes data between MQTT, Modbus TCP, and HTTP
 * via the unified Tag Database.
 */
export declare class DataBridge extends EventEmitter {
    private mappings;
    private initialized;
    initialize(): void;
    private loadMappingsFromDb;
    private setupBridgeListeners;
    addMapping(mapping: TagMapping): void;
    removeMapping(tagAddress: string): void;
    getMappings(): TagMapping[];
    reloadMappings(): void;
}
export declare const dataBridge: DataBridge;
export {};
//# sourceMappingURL=data-bridge.d.ts.map