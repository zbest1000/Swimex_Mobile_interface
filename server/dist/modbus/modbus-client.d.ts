export interface ScanGroup {
    name: string;
    pollingIntervalMs: number;
    registers: Array<{
        type: 'holding' | 'input' | 'coil' | 'discrete';
        startAddress: number;
        count: number;
        tagAddresses: string[];
    }>;
}
/**
 * Modbus TCP Client — polls/writes PLC registers over Ethernet.
 */
export declare class ModbusTcpClient {
    private client;
    private connected;
    private scanGroups;
    private pollTimers;
    private reconnectTimer;
    private host;
    private port;
    private unitId;
    constructor();
    private setupTagBridge;
    configure(host: string, port: number, unitId: number, scanGroups: ScanGroup[]): void;
    connect(): Promise<void>;
    private startPolling;
    private stopPolling;
    private pollGroup;
    writeRegister(address: number, value: number): Promise<void>;
    writeCoil(address: number, value: boolean): Promise<void>;
    private handleDisconnect;
    private scheduleReconnect;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}
export declare const modbusClient: ModbusTcpClient;
//# sourceMappingURL=modbus-client.d.ts.map