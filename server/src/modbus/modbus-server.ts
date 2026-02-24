import net from 'net';
import { config } from '../utils/config';
import { createLogger } from '../utils/logger';
import { tagDatabase } from '../tags/tag-database';
import { getDb } from '../database/connection';
import { ByteOrder, DataType, RegisterType } from '../shared/models';

const log = createLogger('modbus-server');

interface RegisterMapping {
  startAddress: number;
  count: number;
  tagAddress: string;
  registerType: RegisterType;
  dataType: DataType;
  byteOrder: ByteOrder;
  accessMode: 'READ_ONLY' | 'READ_WRITE';
}

const FC_READ_COILS = 0x01;
const FC_READ_DISCRETE_INPUTS = 0x02;
const FC_READ_HOLDING_REGISTERS = 0x03;
const FC_READ_INPUT_REGISTERS = 0x04;
const FC_WRITE_SINGLE_COIL = 0x05;
const FC_WRITE_SINGLE_REGISTER = 0x06;
const FC_WRITE_MULTIPLE_COILS = 0x0f;
const FC_WRITE_MULTIPLE_REGISTERS = 0x10;

const MBAP_HEADER_LENGTH = 7;

/**
 * Full Modbus TCP Server implementation.
 * Exposes EDGE tag data as standard Modbus registers for SCADA/BMS/HMI.
 */
export class ModbusTcpServer {
  private server: net.Server | null = null;
  private connections = new Set<net.Socket>();
  private holdingRegisters = new Int16Array(65536);
  private inputRegisters = new Int16Array(65536);
  private coils = new Uint8Array(65536);
  private discreteInputs = new Uint8Array(65536);
  private registerMappings: RegisterMapping[] = [];
  private started = false;
  private maxConnections = 10;
  private unitId = 1;

  constructor() {
    this.setupTagSync();
  }

  private setupTagSync(): void {
    tagDatabase.on('tag:changed', (address: string, tagValue: { value: unknown; source: string }) => {
      if (tagValue.source === 'modbus-server') return;
      for (const mapping of this.registerMappings) {
        if (mapping.tagAddress === address) {
          this.writeTagValueToRegisters(mapping, tagValue.value);
        }
      }
    });
  }

  private writeTagValueToRegisters(mapping: RegisterMapping, value: unknown): void {
    const numValue = typeof value === 'number' ? value : (typeof value === 'boolean' ? (value ? 1 : 0) : parseFloat(String(value)) || 0);

    switch (mapping.registerType) {
      case RegisterType.HOLDING_REGISTER:
        this.writeValueToRegisterArray(this.holdingRegisters, mapping.startAddress, numValue, mapping.dataType, mapping.byteOrder);
        break;
      case RegisterType.INPUT_REGISTER:
        this.writeValueToRegisterArray(this.inputRegisters, mapping.startAddress, numValue, mapping.dataType, mapping.byteOrder);
        break;
      case RegisterType.COIL:
        this.coils[mapping.startAddress] = numValue ? 1 : 0;
        break;
      case RegisterType.DISCRETE_INPUT:
        this.discreteInputs[mapping.startAddress] = numValue ? 1 : 0;
        break;
    }
  }

  private writeValueToRegisterArray(registers: Int16Array, address: number, value: number, dataType: DataType, byteOrder: ByteOrder): void {
    const buf = Buffer.alloc(8);
    switch (dataType) {
      case DataType.INT16:
        buf.writeInt16BE(Math.round(value), 0);
        registers[address] = buf.readInt16BE(0);
        break;
      case DataType.UINT16:
        buf.writeUInt16BE(Math.round(value) & 0xFFFF, 0);
        registers[address] = buf.readInt16BE(0);
        break;
      case DataType.INT32: {
        buf.writeInt32BE(Math.round(value), 0);
        const [hi, lo] = this.applyByteOrder(buf.readUInt16BE(0), buf.readUInt16BE(2), byteOrder);
        registers[address] = hi;
        registers[address + 1] = lo;
        break;
      }
      case DataType.UINT32: {
        buf.writeUInt32BE(Math.round(value) >>> 0, 0);
        const [hi, lo] = this.applyByteOrder(buf.readUInt16BE(0), buf.readUInt16BE(2), byteOrder);
        registers[address] = hi;
        registers[address + 1] = lo;
        break;
      }
      case DataType.FLOAT32: {
        buf.writeFloatBE(value, 0);
        const [hi, lo] = this.applyByteOrder(buf.readUInt16BE(0), buf.readUInt16BE(2), byteOrder);
        registers[address] = hi;
        registers[address + 1] = lo;
        break;
      }
      case DataType.FLOAT64: {
        buf.writeDoubleBE(value, 0);
        registers[address] = buf.readInt16BE(0);
        registers[address + 1] = buf.readInt16BE(2);
        registers[address + 2] = buf.readInt16BE(4);
        registers[address + 3] = buf.readInt16BE(6);
        break;
      }
      default:
        registers[address] = Math.round(value);
    }
  }

  private readValueFromRegisters(registers: Int16Array, address: number, dataType: DataType, byteOrder: ByteOrder): number {
    const buf = Buffer.alloc(8);
    switch (dataType) {
      case DataType.INT16:
        return registers[address];
      case DataType.UINT16:
        return registers[address] & 0xFFFF;
      case DataType.INT32: {
        const [hi, lo] = this.reverseByteOrder(registers[address] & 0xFFFF, registers[address + 1] & 0xFFFF, byteOrder);
        buf.writeUInt16BE(hi, 0);
        buf.writeUInt16BE(lo, 2);
        return buf.readInt32BE(0);
      }
      case DataType.FLOAT32: {
        const [hi, lo] = this.reverseByteOrder(registers[address] & 0xFFFF, registers[address + 1] & 0xFFFF, byteOrder);
        buf.writeUInt16BE(hi, 0);
        buf.writeUInt16BE(lo, 2);
        return buf.readFloatBE(0);
      }
      default:
        return registers[address];
    }
  }

  private applyByteOrder(hi: number, lo: number, order: ByteOrder): [number, number] {
    switch (order) {
      case ByteOrder.BIG_ENDIAN: return [hi, lo];
      case ByteOrder.LITTLE_ENDIAN: return [lo, hi];
      case ByteOrder.BIG_ENDIAN_WORD_SWAP: return [lo, hi];
      case ByteOrder.LITTLE_ENDIAN_WORD_SWAP: return [hi, lo];
      default: return [hi, lo];
    }
  }

  private reverseByteOrder(r0: number, r1: number, order: ByteOrder): [number, number] {
    return this.applyByteOrder(r0, r1, order);
  }

  loadMappingsFromDb(): void {
    try {
      const db = getDb();
      const rows = db.prepare(`
        SELECT otm.tag_address, otm.data_type, otm.access_mode, otm.protocol,
               otm.tag_address as start_addr
        FROM object_tag_mappings otm
        WHERE otm.protocol = 'MODBUS_TCP'
      `).all() as Record<string, unknown>[];

      this.registerMappings = [];
      let addr = 0;
      for (const row of rows) {
        this.registerMappings.push({
          startAddress: addr,
          count: 1,
          tagAddress: row.tag_address as string,
          registerType: RegisterType.HOLDING_REGISTER,
          dataType: (row.data_type as DataType) || DataType.FLOAT32,
          byteOrder: ByteOrder.BIG_ENDIAN,
          accessMode: row.access_mode === 'READ' ? 'READ_ONLY' : 'READ_WRITE',
        });
        addr += (row.data_type === DataType.FLOAT32 || row.data_type === DataType.INT32 || row.data_type === DataType.UINT32) ? 2 : 1;
      }
      log.info(`Loaded ${this.registerMappings.length} register mappings from database`);
    } catch {
      log.debug('No register mappings loaded');
    }
  }

  mapRegisterToTag(startAddress: number, tagAddress: string, registerType = RegisterType.HOLDING_REGISTER, dataType = DataType.FLOAT32, byteOrder = ByteOrder.BIG_ENDIAN, accessMode: 'READ_ONLY' | 'READ_WRITE' = 'READ_WRITE'): void {
    const count = (dataType === DataType.FLOAT32 || dataType === DataType.INT32 || dataType === DataType.UINT32) ? 2 : (dataType === DataType.FLOAT64 ? 4 : 1);
    this.registerMappings.push({ startAddress, count, tagAddress, registerType, dataType, byteOrder, accessMode });
  }

  async start(): Promise<void> {
    if (this.started) return;

    this.loadMappingsFromDb();
    this.server = net.createServer((socket) => this.handleConnection(socket));

    return new Promise((resolve, reject) => {
      this.server!.listen(config.modbusPort, '0.0.0.0', () => {
        this.started = true;
        log.info(`Modbus TCP server listening on port ${config.modbusPort} (Unit ID: ${this.unitId})`);
        resolve();
      });
      this.server!.on('error', (err) => {
        log.error('Modbus TCP server error', err.message);
        reject(err);
      });
    });
  }

  private handleConnection(socket: net.Socket): void {
    if (this.connections.size >= this.maxConnections) {
      log.warn(`Modbus: max connections (${this.maxConnections}) reached, rejecting`);
      socket.destroy();
      return;
    }

    this.connections.add(socket);
    const remoteAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    log.info(`Modbus TCP client connected: ${remoteAddr} (${this.connections.size} total)`);

    let buffer = Buffer.alloc(0);

    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      while (buffer.length >= MBAP_HEADER_LENGTH) {
        const pduLength = buffer.readUInt16BE(4);
        const totalLength = MBAP_HEADER_LENGTH - 1 + pduLength;
        if (buffer.length < totalLength) break;

        const frame = buffer.subarray(0, totalLength);
        buffer = buffer.subarray(totalLength);

        try {
          const response = this.processFrame(frame);
          if (response) socket.write(response);
        } catch (err: any) {
          log.error(`Modbus frame processing error from ${remoteAddr}`, err.message);
        }
      }
    });

    socket.on('close', () => {
      this.connections.delete(socket);
      log.info(`Modbus TCP client disconnected: ${remoteAddr} (${this.connections.size} total)`);
    });

    socket.on('error', (err) => {
      log.error(`Modbus socket error from ${remoteAddr}`, err.message);
      this.connections.delete(socket);
    });
  }

  private processFrame(frame: Buffer): Buffer | null {
    const transactionId = frame.readUInt16BE(0);
    const protocolId = frame.readUInt16BE(2);
    const unitId = frame.readUInt8(6);
    const functionCode = frame.readUInt8(7);

    if (protocolId !== 0) return null;
    if (unitId !== this.unitId && unitId !== 0) return null;

    let responsePdu: Buffer;

    try {
      switch (functionCode) {
        case FC_READ_COILS:
          responsePdu = this.handleReadBits(frame, this.coils, functionCode);
          break;
        case FC_READ_DISCRETE_INPUTS:
          responsePdu = this.handleReadBits(frame, this.discreteInputs, functionCode);
          break;
        case FC_READ_HOLDING_REGISTERS:
          responsePdu = this.handleReadRegisters(frame, this.holdingRegisters, functionCode);
          break;
        case FC_READ_INPUT_REGISTERS:
          responsePdu = this.handleReadRegisters(frame, this.inputRegisters, functionCode);
          break;
        case FC_WRITE_SINGLE_COIL:
          responsePdu = this.handleWriteSingleCoil(frame);
          break;
        case FC_WRITE_SINGLE_REGISTER:
          responsePdu = this.handleWriteSingleRegister(frame);
          break;
        case FC_WRITE_MULTIPLE_COILS:
          responsePdu = this.handleWriteMultipleCoils(frame);
          break;
        case FC_WRITE_MULTIPLE_REGISTERS:
          responsePdu = this.handleWriteMultipleRegisters(frame);
          break;
        default:
          responsePdu = this.buildExceptionResponse(functionCode, 0x01);
          break;
      }
    } catch {
      responsePdu = this.buildExceptionResponse(functionCode, 0x04);
    }

    const response = Buffer.alloc(MBAP_HEADER_LENGTH - 1 + responsePdu.length + 1);
    response.writeUInt16BE(transactionId, 0);
    response.writeUInt16BE(0, 2);
    response.writeUInt16BE(responsePdu.length + 1, 4);
    response.writeUInt8(unitId, 6);
    responsePdu.copy(response, 7);
    return response;
  }

  private handleReadBits(frame: Buffer, bitArray: Uint8Array, fc: number): Buffer {
    const startAddr = frame.readUInt16BE(8);
    const quantity = frame.readUInt16BE(10);
    if (quantity < 1 || quantity > 2000) return this.buildExceptionResponse(fc, 0x03);

    const byteCount = Math.ceil(quantity / 8);
    const pdu = Buffer.alloc(2 + byteCount);
    pdu.writeUInt8(fc, 0);
    pdu.writeUInt8(byteCount, 1);
    for (let i = 0; i < quantity; i++) {
      if (bitArray[startAddr + i]) {
        pdu[2 + Math.floor(i / 8)] |= (1 << (i % 8));
      }
    }
    return pdu;
  }

  private handleReadRegisters(frame: Buffer, registerArray: Int16Array, fc: number): Buffer {
    const startAddr = frame.readUInt16BE(8);
    const quantity = frame.readUInt16BE(10);
    if (quantity < 1 || quantity > 125) return this.buildExceptionResponse(fc, 0x03);

    const byteCount = quantity * 2;
    const pdu = Buffer.alloc(2 + byteCount);
    pdu.writeUInt8(fc, 0);
    pdu.writeUInt8(byteCount, 1);
    for (let i = 0; i < quantity; i++) {
      pdu.writeInt16BE(registerArray[startAddr + i] || 0, 2 + i * 2);
    }
    return pdu;
  }

  private handleWriteSingleCoil(frame: Buffer): Buffer {
    const addr = frame.readUInt16BE(8);
    const value = frame.readUInt16BE(10);
    const boolVal = value === 0xFF00;

    const mapping = this.findMapping(addr, RegisterType.COIL);
    if (mapping?.accessMode === 'READ_ONLY') return this.buildExceptionResponse(FC_WRITE_SINGLE_COIL, 0x04);

    this.coils[addr] = boolVal ? 1 : 0;
    if (mapping) tagDatabase.writeTag(mapping.tagAddress, boolVal, 'modbus-server');

    const pdu = Buffer.alloc(5);
    pdu.writeUInt8(FC_WRITE_SINGLE_COIL, 0);
    pdu.writeUInt16BE(addr, 1);
    pdu.writeUInt16BE(value, 3);
    return pdu;
  }

  private handleWriteSingleRegister(frame: Buffer): Buffer {
    const addr = frame.readUInt16BE(8);
    const value = frame.readInt16BE(10);

    const mapping = this.findMapping(addr, RegisterType.HOLDING_REGISTER);
    if (mapping?.accessMode === 'READ_ONLY') return this.buildExceptionResponse(FC_WRITE_SINGLE_REGISTER, 0x04);

    this.holdingRegisters[addr] = value;
    if (mapping) {
      const tagVal = this.readValueFromRegisters(this.holdingRegisters, mapping.startAddress, mapping.dataType, mapping.byteOrder);
      tagDatabase.writeTag(mapping.tagAddress, tagVal, 'modbus-server');
    }

    const pdu = Buffer.alloc(5);
    pdu.writeUInt8(FC_WRITE_SINGLE_REGISTER, 0);
    pdu.writeUInt16BE(addr, 1);
    pdu.writeInt16BE(value, 3);
    return pdu;
  }

  private handleWriteMultipleCoils(frame: Buffer): Buffer {
    const startAddr = frame.readUInt16BE(8);
    const quantity = frame.readUInt16BE(10);
    const byteCount = frame.readUInt8(12);

    for (let i = 0; i < quantity; i++) {
      const byteIdx = Math.floor(i / 8);
      const bitIdx = i % 8;
      this.coils[startAddr + i] = (frame[13 + byteIdx] >> bitIdx) & 1;
    }

    const pdu = Buffer.alloc(5);
    pdu.writeUInt8(FC_WRITE_MULTIPLE_COILS, 0);
    pdu.writeUInt16BE(startAddr, 1);
    pdu.writeUInt16BE(quantity, 3);
    return pdu;
  }

  private handleWriteMultipleRegisters(frame: Buffer): Buffer {
    const startAddr = frame.readUInt16BE(8);
    const quantity = frame.readUInt16BE(10);

    for (let i = 0; i < quantity; i++) {
      const val = frame.readInt16BE(13 + i * 2);
      this.holdingRegisters[startAddr + i] = val;
    }

    for (const mapping of this.registerMappings) {
      if (mapping.registerType === RegisterType.HOLDING_REGISTER &&
          mapping.startAddress >= startAddr &&
          mapping.startAddress < startAddr + quantity) {
        const tagVal = this.readValueFromRegisters(this.holdingRegisters, mapping.startAddress, mapping.dataType, mapping.byteOrder);
        tagDatabase.writeTag(mapping.tagAddress, tagVal, 'modbus-server');
      }
    }

    const pdu = Buffer.alloc(5);
    pdu.writeUInt8(FC_WRITE_MULTIPLE_REGISTERS, 0);
    pdu.writeUInt16BE(startAddr, 1);
    pdu.writeUInt16BE(quantity, 3);
    return pdu;
  }

  private findMapping(address: number, type: RegisterType): RegisterMapping | undefined {
    return this.registerMappings.find(m =>
      m.registerType === type &&
      address >= m.startAddress &&
      address < m.startAddress + m.count
    );
  }

  private buildExceptionResponse(fc: number, exceptionCode: number): Buffer {
    const pdu = Buffer.alloc(2);
    pdu.writeUInt8(fc | 0x80, 0);
    pdu.writeUInt8(exceptionCode, 1);
    return pdu;
  }

  setHoldingRegister(addr: number, value: number): void {
    this.holdingRegisters[addr] = value;
  }

  setInputRegister(addr: number, value: number): void {
    this.inputRegisters[addr] = value;
  }

  setCoil(addr: number, value: boolean): void {
    this.coils[addr] = value ? 1 : 0;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    for (const conn of this.connections) {
      conn.destroy();
    }
    this.connections.clear();
    return new Promise((resolve) => {
      this.server!.close(() => {
        this.started = false;
        this.server = null;
        log.info('Modbus TCP server stopped');
        resolve();
      });
    });
  }

  isRunning(): boolean {
    return this.started;
  }
}

export const modbusServer = new ModbusTcpServer();
