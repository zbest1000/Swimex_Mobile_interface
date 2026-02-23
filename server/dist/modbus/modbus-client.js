"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.modbusClient = exports.ModbusTcpClient = void 0;
const modbus_serial_1 = __importDefault(require("modbus-serial"));
const logger_1 = require("../utils/logger");
const tag_database_1 = require("../tags/tag-database");
const log = (0, logger_1.createLogger)('modbus-client');
/**
 * Modbus TCP Client — polls/writes PLC registers over Ethernet.
 */
class ModbusTcpClient {
    client;
    connected = false;
    scanGroups = [];
    pollTimers = [];
    reconnectTimer = null;
    host = '';
    port = 502;
    unitId = 1;
    constructor() {
        this.client = new modbus_serial_1.default();
        this.setupTagBridge();
    }
    setupTagBridge() {
        tag_database_1.tagDatabase.on('tag:changed', (address, tagValue) => {
            if (tagValue.source === 'modbus-client')
                return;
            // Write-through to PLC if this tag is mapped to a register
            // Implementation deferred to write method
        });
    }
    configure(host, port, unitId, scanGroups) {
        this.host = host;
        this.port = port;
        this.unitId = unitId;
        this.scanGroups = scanGroups;
    }
    async connect() {
        if (this.connected)
            return;
        try {
            await this.client.connectTCP(this.host, { port: this.port });
            this.client.setID(this.unitId);
            this.client.setTimeout(5000);
            this.connected = true;
            log.info(`Modbus TCP client connected to ${this.host}:${this.port}`);
            this.startPolling();
        }
        catch (err) {
            log.error(`Modbus TCP client connection failed: ${this.host}:${this.port}`, err);
            this.scheduleReconnect();
        }
    }
    startPolling() {
        this.stopPolling();
        for (const group of this.scanGroups) {
            const timer = setInterval(async () => {
                await this.pollGroup(group);
            }, group.pollingIntervalMs);
            this.pollTimers.push(timer);
            log.debug(`Polling group "${group.name}" every ${group.pollingIntervalMs}ms`);
        }
    }
    stopPolling() {
        for (const timer of this.pollTimers) {
            clearInterval(timer);
        }
        this.pollTimers = [];
    }
    async pollGroup(group) {
        if (!this.connected)
            return;
        for (const reg of group.registers) {
            try {
                let data;
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
                        tag_database_1.tagDatabase.writeTag(reg.tagAddresses[i], data.data[i], 'modbus-client');
                    }
                }
            }
            catch (err) {
                log.error(`Poll error for group "${group.name}", reg ${reg.startAddress}`, err);
                this.handleDisconnect();
                return;
            }
        }
    }
    async writeRegister(address, value) {
        if (!this.connected) {
            log.warn('Cannot write — Modbus client not connected');
            return;
        }
        try {
            await this.client.writeRegister(address, value);
        }
        catch (err) {
            log.error(`Write register ${address} failed`, err);
            this.handleDisconnect();
        }
    }
    async writeCoil(address, value) {
        if (!this.connected)
            return;
        try {
            await this.client.writeCoil(address, value);
        }
        catch (err) {
            log.error(`Write coil ${address} failed`, err);
            this.handleDisconnect();
        }
    }
    handleDisconnect() {
        this.connected = false;
        this.stopPolling();
        log.warn('Modbus TCP client disconnected');
        this.scheduleReconnect();
    }
    scheduleReconnect() {
        if (this.reconnectTimer)
            return;
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            log.info('Attempting Modbus TCP reconnect...');
            await this.connect();
        }, 5000);
    }
    async disconnect() {
        this.stopPolling();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.connected) {
            this.client.close(() => { });
            this.connected = false;
            log.info('Modbus TCP client disconnected');
        }
    }
    isConnected() {
        return this.connected;
    }
}
exports.ModbusTcpClient = ModbusTcpClient;
exports.modbusClient = new ModbusTcpClient();
//# sourceMappingURL=modbus-client.js.map