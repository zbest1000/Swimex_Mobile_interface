"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataBridge = exports.DataBridge = void 0;
const events_1 = require("events");
const tag_database_1 = require("../tags/tag-database");
const modbus_server_1 = require("../modbus/modbus-server");
const logger_1 = require("../utils/logger");
const connection_1 = require("../database/connection");
const log = (0, logger_1.createLogger)('data-bridge');
/**
 * Internal Data Bridge — synchronizes data between MQTT, Modbus TCP, and HTTP
 * via the unified Tag Database.
 */
class DataBridge extends events_1.EventEmitter {
    mappings = [];
    initialized = false;
    initialize() {
        if (this.initialized)
            return;
        this.loadMappingsFromDb();
        this.setupBridgeListeners();
        this.initialized = true;
        log.info(`Data bridge initialized with ${this.mappings.length} mappings`);
    }
    loadMappingsFromDb() {
        try {
            const db = (0, connection_1.getDb)();
            const rows = db.prepare('SELECT * FROM object_tag_mappings').all();
            this.mappings = rows.map(row => ({
                tagAddress: row.tag_address,
                protocol: row.protocol,
                modbusRegister: row.protocol === 'MODBUS_TCP' ? parseInt(row.tag_address, 10) : undefined,
                mqttTopic: row.protocol === 'MQTT' ? row.tag_address : undefined,
                httpEndpoint: row.protocol === 'HTTP' ? row.tag_address : undefined,
            }));
            // Register tags and Modbus mappings
            for (const mapping of this.mappings) {
                tag_database_1.tagDatabase.registerTag(mapping.tagAddress, {
                    address: mapping.tagAddress,
                    dataType: 'FLOAT32',
                    accessMode: 'READ_WRITE',
                    scaleFactor: 1.0,
                    offset: 0,
                });
                if (mapping.modbusRegister !== undefined) {
                    modbus_server_1.modbusServer.mapRegisterToTag(mapping.modbusRegister, mapping.tagAddress);
                }
            }
        }
        catch {
            log.warn('No tag mappings loaded (database may not have mappings yet)');
        }
    }
    setupBridgeListeners() {
        tag_database_1.tagDatabase.on('tag:changed', (address, tagValue) => {
            this.emit('tag:update', address, tagValue);
        });
    }
    addMapping(mapping) {
        this.mappings.push(mapping);
        tag_database_1.tagDatabase.registerTag(mapping.tagAddress, {
            address: mapping.tagAddress,
            dataType: 'FLOAT32',
            accessMode: 'READ_WRITE',
            scaleFactor: 1.0,
            offset: 0,
        });
        if (mapping.modbusRegister !== undefined) {
            modbus_server_1.modbusServer.mapRegisterToTag(mapping.modbusRegister, mapping.tagAddress);
        }
    }
    removeMapping(tagAddress) {
        this.mappings = this.mappings.filter(m => m.tagAddress !== tagAddress);
        tag_database_1.tagDatabase.unregisterTag(tagAddress);
    }
    getMappings() {
        return [...this.mappings];
    }
    reloadMappings() {
        this.mappings = [];
        this.loadMappingsFromDb();
        log.info(`Data bridge reloaded with ${this.mappings.length} mappings`);
    }
}
exports.DataBridge = DataBridge;
exports.dataBridge = new DataBridge();
//# sourceMappingURL=data-bridge.js.map