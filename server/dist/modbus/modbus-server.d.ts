/**
 * Modbus TCP Server — exposes EDGE data as standard Modbus registers.
 * External SCADA/BMS/HMI systems poll this server.
 */
export declare class ModbusTcpServer {
    private serverTCP;
    private holdingRegisters;
    private inputRegisters;
    private coils;
    private discreteInputs;
    private registerTagMap;
    private started;
    constructor();
    private setupTagBridge;
    mapRegisterToTag(registerAddress: number, tagAddress: string): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    setHoldingRegister(addr: number, value: number): void;
    setInputRegister(addr: number, value: number): void;
    isRunning(): boolean;
}
export declare const modbusServer: ModbusTcpServer;
//# sourceMappingURL=modbus-server.d.ts.map