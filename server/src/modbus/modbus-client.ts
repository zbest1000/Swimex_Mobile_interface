import ModbusRTU from 'modbus-serial';
import { createLogger } from '../utils/logger';
import { tagDatabase } from '../tags/tag-database';

const log = createLogger('modbus-client');

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
export class ModbusTcpClient {
  private client: ModbusRTU;
  private connected = false;
  private scanGroups: ScanGroup[] = [];
  private pollTimers: NodeJS.Timeout[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private host: string = '';
  private port: number = 502;
  private unitId: number = 1;

  constructor() {
    this.client = new ModbusRTU();
    this.setupTagBridge();
  }

  private setupTagBridge(): void {
    tagDatabase.on('tag:changed', (address: string, tagValue: { value: unknown; source: string }) => {
      if (tagValue.source === 'modbus-client') return;
      // Write-through to PLC if this tag is mapped to a register
      // Implementation deferred to write method
    });
  }

  configure(host: string, port: number, unitId: number, scanGroups: ScanGroup[]): void {
    this.host = host;
    this.port = port;
    this.unitId = unitId;
    this.scanGroups = scanGroups;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      await this.client.connectTCP(this.host, { port: this.port });
      this.client.setID(this.unitId);
      this.client.setTimeout(5000);
      this.connected = true;
      log.info(`Modbus TCP client connected to ${this.host}:${this.port}`);
      this.startPolling();
    } catch (err) {
      log.error(`Modbus TCP client connection failed: ${this.host}:${this.port}`, err);
      this.scheduleReconnect();
    }
  }

  private startPolling(): void {
    this.stopPolling();

    for (const group of this.scanGroups) {
      const timer = setInterval(async () => {
        await this.pollGroup(group);
      }, group.pollingIntervalMs);
      this.pollTimers.push(timer);
      log.debug(`Polling group "${group.name}" every ${group.pollingIntervalMs}ms`);
    }
  }

  private stopPolling(): void {
    for (const timer of this.pollTimers) {
      clearInterval(timer);
    }
    this.pollTimers = [];
  }

  private async pollGroup(group: ScanGroup): Promise<void> {
    if (!this.connected) return;

    for (const reg of group.registers) {
      try {
        let data: { data: number[] | boolean[] };

        switch (reg.type) {
          case 'holding':
            data = await this.client.readHoldingRegisters(reg.startAddress, reg.count);
            break;
          case 'input':
            data = await this.client.readInputRegisters(reg.startAddress, reg.count);
            break;
          case 'coil':
            data = await this.client.readCoils(reg.startAddress, reg.count);
            break;
          case 'discrete':
            data = await this.client.readDiscreteInputs(reg.startAddress, reg.count);
            break;
        }

        // Map register values to tags
        for (let i = 0; i < data.data.length && i < reg.tagAddresses.length; i++) {
          if (reg.tagAddresses[i]) {
            tagDatabase.writeTag(reg.tagAddresses[i], data.data[i], 'modbus-client');
          }
        }
      } catch (err) {
        log.error(`Poll error for group "${group.name}", reg ${reg.startAddress}`, err);
        this.handleDisconnect();
        return;
      }
    }
  }

  async writeRegister(address: number, value: number): Promise<void> {
    if (!this.connected) {
      log.warn('Cannot write — Modbus client not connected');
      return;
    }
    try {
      await this.client.writeRegister(address, value);
    } catch (err) {
      log.error(`Write register ${address} failed`, err);
      this.handleDisconnect();
    }
  }

  async writeCoil(address: number, value: boolean): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.writeCoil(address, value);
    } catch (err) {
      log.error(`Write coil ${address} failed`, err);
      this.handleDisconnect();
    }
  }

  private handleDisconnect(): void {
    this.connected = false;
    this.stopPolling();
    log.warn('Modbus TCP client disconnected');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      log.info('Attempting Modbus TCP reconnect...');
      await this.connect();
    }, 5000);
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connected) {
      this.client.close(() => {});
      this.connected = false;
      log.info('Modbus TCP client disconnected');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const modbusClient = new ModbusTcpClient();
