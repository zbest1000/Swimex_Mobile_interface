import { config } from '../utils/config';
import { createLogger } from '../utils/logger';
import { tagDatabase } from '../tags/tag-database';

const log = createLogger('modbus-server');

/**
 * Modbus TCP Server — exposes EDGE data as standard Modbus registers.
 * External SCADA/BMS/HMI systems poll this server.
 */
export class ModbusTcpServer {
  private serverTCP: any = null;
  private holdingRegisters: number[] = new Array(10000).fill(0);
  private inputRegisters: number[] = new Array(10000).fill(0);
  private coils: boolean[] = new Array(10000).fill(false);
  private discreteInputs: boolean[] = new Array(10000).fill(false);
  private registerTagMap = new Map<number, string>(); // register address → tag address
  private started = false;

  constructor() {
    this.setupTagBridge();
  }

  private setupTagBridge(): void {
    tagDatabase.on('tag:changed', (address: string, tagValue: { value: unknown; source: string }) => {
      if (tagValue.source === 'modbus-server') return;
      // Find register mapped to this tag and update
      for (const [reg, tag] of this.registerTagMap) {
        if (tag === address) {
          const val = typeof tagValue.value === 'number' ? tagValue.value : 0;
          this.holdingRegisters[reg] = Math.round(val);
        }
      }
    });
  }

  mapRegisterToTag(registerAddress: number, tagAddress: string): void {
    this.registerTagMap.set(registerAddress, tagAddress);
    log.debug(`Modbus register ${registerAddress} → tag ${tagAddress}`);
  }

  async start(): Promise<void> {
    if (this.started) return;

    const vector = {
      getInputRegister: (addr: number) => this.inputRegisters[addr] ?? 0,
      getHoldingRegister: (addr: number) => this.holdingRegisters[addr] ?? 0,
      getCoil: (addr: number) => this.coils[addr] ?? false,
      getDiscreteInput: (addr: number) => this.discreteInputs[addr] ?? false,
      setRegister: (addr: number, value: number) => {
        this.holdingRegisters[addr] = value;
        const tag = this.registerTagMap.get(addr);
        if (tag) {
          tagDatabase.writeTag(tag, value, 'modbus-server');
        }
      },
      setCoil: (addr: number, value: boolean) => {
        this.coils[addr] = value;
      },
    };

    try {
      // Dynamic require because modbus-serial types don't export ServerTCP
      const ModbusRTU = require('modbus-serial');
      this.serverTCP = new ModbusRTU.ServerTCP(vector, {
        host: '0.0.0.0',
        port: config.modbusPort,
        unitID: 1,
      });

      this.started = true;
      log.info(`Modbus TCP server listening on port ${config.modbusPort}`);
    } catch (err) {
      log.error('Failed to start Modbus TCP server', err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (this.serverTCP) {
      this.serverTCP.close(() => {
        this.started = false;
        log.info('Modbus TCP server stopped');
      });
    }
  }

  setHoldingRegister(addr: number, value: number): void {
    this.holdingRegisters[addr] = value;
  }

  setInputRegister(addr: number, value: number): void {
    this.inputRegisters[addr] = value;
  }

  isRunning(): boolean {
    return this.started;
  }
}

export const modbusServer = new ModbusTcpServer();
