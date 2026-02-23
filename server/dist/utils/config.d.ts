export interface ServerConfig {
    httpPort: number;
    httpsPort: number;
    mqttPort: number;
    mqttTlsPort: number;
    modbusPort: number;
    dataDir: string;
    configDir: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    heartbeatIntervalMs: number;
    heartbeatMissedThreshold: number;
    defaultAdminUser: string;
    defaultAdminPass: string;
    poolId: string;
    logLevel: string;
}
export declare function loadConfig(): ServerConfig;
export declare const config: ServerConfig;
//# sourceMappingURL=config.d.ts.map