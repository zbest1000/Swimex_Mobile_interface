import { Server } from 'http';
export declare class WebSocketHandler {
    private wss;
    private clients;
    private heartbeatTimer;
    attach(server: Server): void;
    private handleConnection;
    private handleMessage;
    private handleCommand;
    private setupWorkoutBroadcasts;
    private setupTagBroadcasts;
    private startHeartbeat;
    broadcast(message: any): void;
    broadcastToAuthenticated(message: any): void;
    private sendToClient;
    getConnectedCount(): number;
    stop(): void;
}
export declare const wsHandler: WebSocketHandler;
//# sourceMappingURL=ws-handler.d.ts.map