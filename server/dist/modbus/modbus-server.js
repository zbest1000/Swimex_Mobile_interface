"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.modbusServer = exports.ModbusTcpServer = void 0;
const modbus_serial_1 = __importDefault(require("modbus-serial"));
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
const tag_database_1 = require("../tags/tag-database");
const log = (0, logger_1.createLogger)('modbus-server');
/**
 * Modbus TCP Server — exposes EDGE data as standard Modbus registers.
 * External SCADA/BMS/HMI systems poll this server.
 */
class ModbusTcpServer {
    serverTCP = null;
    holdingRegisters = new Array(10000).fill(0);
    inputRegisters = new Array(10000).fill(0);
    coils = new Array(10000).fill(false);
    discreteInputs = new Array(10000).fill(false);
    registerTagMap = new Map(); // register address → tag address
    started = false;
    constructor() {
        this.setupTagBridge();
    }
    setupTagBridge() {
        tag_database_1.tagDatabase.on('tag:changed', (address, tagValue) => {
            if (tagValue.source === 'modbus-server')
                return;
            // Find register mapped to this tag and update
            for (const [reg, tag] of this.registerTagMap) {
                if (tag === address) {
                    const val = typeof tagValue.value === 'number' ? tagValue.value : 0;
                    this.holdingRegisters[reg] = Math.round(val);
                }
            }
        });
    }
    mapRegisterToTag(registerAddress, tagAddress) {
        this.registerTagMap.set(registerAddress, tagAddress);
        log.debug(`Modbus register ${registerAddress} → tag ${tagAddress}`);
    }
    async start() {
        if (this.started)
            return;
        const vector = {
            getInputRegister: (addr) => this.inputRegisters[addr] ?? 0,
            getHoldingRegister: (addr) => this.holdingRegisters[addr] ?? 0,
            getCoil: (addr) => this.coils[addr] ?? false,
            getDiscreteInput: (addr) => this.discreteInputs[addr] ?? false,
            setRegister: (addr, value) => {
                this.holdingRegisters[addr] = value;
                const tag = this.registerTagMap.get(addr);
                if (tag) {
                    tag_database_1.tagDatabase.writeTag(tag, value, 'modbus-server');
                }
            },
            setCoil: (addr, value) => {
                this.coils[addr] = value;
            },
        };
        try {
            this.serverTCP = new modbus_serial_1.default.ServerTCP(vector, {
                host: '0.0.0.0',
                port: config_1.config.modbusPort,
                unitID: 1,
            });
            this.started = true;
            log.info(`Modbus TCP server listening on port ${config_1.config.modbusPort}`);
        }
        catch (err) {
            log.error('Failed to start Modbus TCP server', err);
            throw err;
        }
    }
    async stop() {
        if (this.serverTCP) {
            this.serverTCP.close(() => {
                this.started = false;
                log.info('Modbus TCP server stopped');
            });
        }
    }
    setHoldingRegister(addr, value) {
        this.holdingRegisters[addr] = value;
    }
    setInputRegister(addr, value) {
        this.inputRegisters[addr] = value;
    }
    isRunning() {
        return this.started;
    }
}
exports.ModbusTcpServer = ModbusTcpServer;
exports.modbusServer = new ModbusTcpServer();
//# sourceMappingURL=modbus-server.js.map