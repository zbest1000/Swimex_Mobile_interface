import ModbusRTU from 'modbus-serial';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { tagDatabase } from '../tags/tag-database';
import { DataType, ByteOrder } from '../shared/models';

const log = createLogger('modbus-client');

export interface RegisterMapping {
  type: 'holding' | 'input' | 'coil' | 'discrete';
  startAddress: number;
  count: number;
  tagAddresses: string[];
  dataType: DataType;
  byteOrder: ByteOrder;
}

export interface ScanGroup {
  name: string;
  pollingIntervalMs: number;
  registers: RegisterMapping[];
  enabled: boolean;
}

export interface ModbusClientConfig {
  host: string;
  port: number;
  unitId: number;
  timeoutMs: number;
  retries: number;
  writeStrategy: 'WRITE_ON_CHANGE' | 'CYCLIC';
  scanGroups: ScanGroup[];
}

/**
 * Full Modbus TCP Client — polls PLC registers over Ethernet and writes commands.
 * Supports multiple scan groups with independent polling rates.
 */
export class ModbusTcpClient extends EventEmitter {
  private client: ModbusRTU;
  private config: ModbusClientConfig | null = null;
  private connected = false;
  private connecting = false;
  private pollTimers: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_DELAY = 30000;
  private pendingWrites: Map<number, number> = new Map();
  private writeTimer: NodeJS.Timeout | null = null;
  private lastPollErrors: Map<string, number> = new Map();
  private stats = {
    totalReads: 0,
    totalWrites: 0,
    totalErrors: 0,
    lastPollTimeMs: 0,
  };

  constructor() {
    super();
    this.client = new ModbusRTU();
  }

  configure(cfg: ModbusClientConfig): void {
    this.config = cfg;
    log.info(`Modbus client configured: ${cfg.host}:${cfg.port} (Unit ${cfg.unitId}), ${cfg.scanGroups.length} scan groups`);
  }

  async connect(): Promise<void> {
    if (!this.config || this.connected || this.connecting) return;
    this.connecting = true;

    try {
      await this.client.connectTCP(this.config.host, { port: this.config.port });
      this.client.setID(this.config.unitId);
      this.client.setTimeout(this.config.timeoutMs);

      this.connected = true;
      this.connecting = false;
      this.reconnectAttempts = 0;
      log.info(`Modbus TCP client connected to ${this.config.host}:${this.config.port} (Unit ${this.config.unitId})`);

      this.startPolling();
      this.setupWriteThrough();
      this.emit('connected');
    } catch (err: any) {
      this.connecting = false;
      log.error(`Modbus TCP connect failed: ${err.message}`);
      this.scheduleReconnect();
    }
  }

  private startPolling(): void {
    if (!this.config) return;
    this.stopPolling();

    for (const group of this.config.scanGroups) {
      if (!group.enabled) continue;

      const timer = setInterval(() => this.pollGroup(group), group.pollingIntervalMs);
      this.pollTimers.set(group.name, timer);
      log.info(`Polling "${group.name}": ${group.registers.length} register blocks every ${group.pollingIntervalMs}ms`);

      // Immediate first poll
      this.pollGroup(group);
    }
  }

  private stopPolling(): void {
    for (const [, timer] of this.pollTimers) {
      clearInterval(timer);
    }
    this.pollTimers.clear();
  }

  private async pollGroup(group: ScanGroup): Promise<void> {
    if (!this.connected) return;
    const pollStart = Date.now();

    for (const reg of group.registers) {
      try {
        await this.pollRegisterBlock(reg);
        this.stats.totalReads++;
        this.lastPollErrors.delete(`${group.name}:${reg.startAddress}`);
      } catch (err: any) {
        this.stats.totalErrors++;
        const key = `${group.name}:${reg.startAddress}`;
        const errorCount = (this.lastPollErrors.get(key) ?? 0) + 1;
        this.lastPollErrors.set(key, errorCount);

        if (errorCount <= 3) {
          log.warn(`Poll error "${group.name}" addr ${reg.startAddress}: ${err.message}`);
        }
        if (errorCount >= 5) {
          log.error(`Persistent poll failures for "${group.name}" addr ${reg.startAddress}, disconnecting`);
          this.handleDisconnect();
          return;
        }
      }
    }

    this.stats.lastPollTimeMs = Date.now() - pollStart;
  }

  private async pollRegisterBlock(reg: RegisterMapping): Promise<void> {
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

    this.mapDataToTags(reg, data.data);
  }

  private mapDataToTags(reg: RegisterMapping, rawData: number[] | boolean[]): void {
    if (reg.type === 'coil' || reg.type === 'discrete') {
      for (let i = 0; i < rawData.length && i < reg.tagAddresses.length; i++) {
        if (reg.tagAddresses[i]) {
          tagDatabase.writeTag(reg.tagAddresses[i], Boolean(rawData[i]), 'modbus-client');
        }
      }
      return;
    }

    const numData = rawData as number[];
    let dataIdx = 0;
    for (let i = 0; i < reg.tagAddresses.length; i++) {
      if (!reg.tagAddresses[i]) {
        dataIdx++;
        continue;
      }

      let value: number;
      switch (reg.dataType) {
        case DataType.INT16:
          value = this.toSigned16(numData[dataIdx]);
          dataIdx++;
          break;
        case DataType.UINT16:
          value = numData[dataIdx] & 0xFFFF;
          dataIdx++;
          break;
        case DataType.INT32:
        case DataType.UINT32:
        case DataType.FLOAT32: {
          if (dataIdx + 1 >= numData.length) { dataIdx++; continue; }
          const buf = Buffer.alloc(4);
          const [hi, lo] = this.orderWords(numData[dataIdx], numData[dataIdx + 1], reg.byteOrder);
          buf.writeUInt16BE(hi & 0xFFFF, 0);
          buf.writeUInt16BE(lo & 0xFFFF, 2);
          value = reg.dataType === DataType.FLOAT32 ? buf.readFloatBE(0) :
                  reg.dataType === DataType.INT32 ? buf.readInt32BE(0) :
                  buf.readUInt32BE(0);
          dataIdx += 2;
          break;
        }
        default:
          value = numData[dataIdx];
          dataIdx++;
      }

      tagDatabase.writeTag(reg.tagAddresses[i], value, 'modbus-client');
    }
  }

  private toSigned16(val: number): number {
    return val > 32767 ? val - 65536 : val;
  }

  private orderWords(w0: number, w1: number, order: ByteOrder): [number, number] {
    switch (order) {
      case ByteOrder.BIG_ENDIAN: return [w0, w1];
      case ByteOrder.LITTLE_ENDIAN: return [w1, w0];
      case ByteOrder.BIG_ENDIAN_WORD_SWAP: return [w1, w0];
      case ByteOrder.LITTLE_ENDIAN_WORD_SWAP: return [w0, w1];
      default: return [w0, w1];
    }
  }

  private setupWriteThrough(): void {
    if (!this.config) return;
    if (this.writeTimer) clearInterval(this.writeTimer);

    tagDatabase.on('tag:changed', (address: string, tagValue: { value: unknown; source: string }) => {
      if (tagValue.source === 'modbus-client') return;
      if (!this.config) return;

      for (const group of this.config.scanGroups) {
        for (const reg of group.registers) {
          if (reg.type !== 'holding' && reg.type !== 'coil') continue;
          const tagIdx = reg.tagAddresses.indexOf(address);
          if (tagIdx === -1) continue;

          const numVal = typeof tagValue.value === 'number' ? tagValue.value :
                         typeof tagValue.value === 'boolean' ? (tagValue.value ? 1 : 0) : 0;

          if (this.config.writeStrategy === 'WRITE_ON_CHANGE') {
            this.writeRegisterImmediate(reg.startAddress + tagIdx, numVal, reg.type === 'coil').catch((err: any) => {
              log.warn(`Write-through failed for addr ${reg.startAddress + tagIdx}: ${err?.message ?? 'unknown'}`);
            });
          } else {
            this.pendingWrites.set(reg.startAddress + tagIdx, numVal);
          }
        }
      }
    });

    if (this.config.writeStrategy === 'CYCLIC') {
      this.writeTimer = setInterval(() => this.flushPendingWrites(), 500);
    }
  }

  async writeRegisterImmediate(address: number, value: number, isCoil = false): Promise<void> {
    if (!this.connected) {
      log.warn('Cannot write — Modbus client not connected');
      return;
    }

    try {
      if (isCoil) {
        await this.client.writeCoil(address, Boolean(value));
      } else {
        await this.client.writeRegister(address, value & 0xFFFF);
      }
      this.stats.totalWrites++;
    } catch (err: any) {
      this.stats.totalErrors++;
      log.error(`Write failed addr ${address}: ${err.message}`);
      if (err.message.includes('Timed out') || err.message.includes('Port Not Open')) {
        this.handleDisconnect();
      }
    }
  }

  async writeMultipleRegisters(startAddress: number, values: number[]): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.writeRegisters(startAddress, values);
      this.stats.totalWrites++;
    } catch (err: any) {
      this.stats.totalErrors++;
      log.error(`Multi-write failed addr ${startAddress}: ${err.message}`);
    }
  }

  private async flushPendingWrites(): Promise<void> {
    if (this.pendingWrites.size === 0 || !this.connected) return;
    const writes = new Map(this.pendingWrites);
    this.pendingWrites.clear();

    for (const [addr, val] of writes) {
      await this.writeRegisterImmediate(addr, val);
    }
  }

  private handleDisconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    this.stopPolling();
    if (this.writeTimer) { clearInterval(this.writeTimer); this.writeTimer = null; }
    log.warn('Modbus TCP client disconnected from PLC');
    this.emit('disconnected');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), this.MAX_RECONNECT_DELAY);

    log.info(`Modbus reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        this.client = new ModbusRTU();
        await this.connect();
      } catch { /* connect() handles its own errors */ }
    }, delay);
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.writeTimer) { clearInterval(this.writeTimer); this.writeTimer = null; }
    if (this.connected) {
      try {
        this.client.close(() => { log.debug('Modbus client socket closed'); });
      } catch (err: any) {
        log.debug(`Modbus client close: ${err?.message ?? 'unknown'}`);
      }
      this.connected = false;
      log.info('Modbus TCP client disconnected');
    }
  }

  isConnected(): boolean { return this.connected; }
  getStats() { return { ...this.stats }; }
}

export const modbusClient = new ModbusTcpClient();
