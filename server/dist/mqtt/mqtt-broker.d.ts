export declare class MqttBroker {
    private aedes;
    private server;
    private topics;
    private started;
    constructor();
    private setupHandlers;
    private bridgeToTagDatabase;
    private mqttTopicToTagAddress;
    private tagAddressToMqttTopic;
    publish(topic: string, payload: string, options?: {
        retain?: boolean;
        qos?: 0 | 1 | 2;
    }): void;
    publishKeepAlive(): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    getConnectedClients(): number;
    isRunning(): boolean;
}
export declare const mqttBroker: MqttBroker;
//# sourceMappingURL=mqtt-broker.d.ts.map