import { EventEmitter } from 'events';
import { tagDatabase, TagValue } from '../tags/tag-database';
import { mqttBroker } from '../mqtt/mqtt-broker';
import { modbusServer } from '../modbus/modbus-server';
import { modbusClient } from '../modbus/modbus-client';
import { createLogger } from '../utils/logger';
import { getDb } from '../database/connection';

const log = createLogger('data-bridge');

interface ProtocolMapping {
  id: string;
  tagAddress: string;
  protocol: string;
  objectId: string;
  objectName: string;
  mqttTopic?: string;
  modbusRegister?: number;
  httpEndpoint?: string;
  dataType: string;
  accessMode: string;
  scaleFactor: number;
  offset: number;
}

/**
 * Internal Data Bridge — synchronizes data between MQTT, Modbus TCP, and HTTP
 * via the unified Tag Database. Ensures all protocols see consistent state.
 */
export class DataBridge extends EventEmitter {
  private mappings: ProtocolMapping[] = [];
  private initialized = false;
  private syncStats = { mqttToTag: 0, tagToMqtt: 0, modbusToTag: 0, tagToModbus: 0 };

  initialize(): void {
    if (this.initialized) return;

    this.loadMappingsFromDb();
    this.setupMqttToTagBridge();
    this.setupTagToMqttBridge();
    this.setupModbusIntegration();

    this.initialized = true;
    log.info(`Data bridge initialized: ${this.mappings.length} mappings across ${this.countProtocols()} protocols`);
  }

  private loadMappingsFromDb(): void {
    try {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM object_tag_mappings').all() as Record<string, unknown>[];

      this.mappings = rows.map(row => ({
        id: row.id as string,
        tagAddress: row.tag_address as string,
        protocol: row.protocol as string,
        objectId: row.object_id as string,
        objectName: row.object_name as string,
        mqttTopic: row.protocol === 'MQTT' ? row.tag_address as string : undefined,
        modbusRegister: row.protocol === 'MODBUS_TCP' ? parseInt(row.tag_address as string, 10) || undefined : undefined,
        httpEndpoint: row.protocol === 'HTTP' ? row.tag_address as string : undefined,
        dataType: row.data_type as string,
        accessMode: row.access_mode as string,
        scaleFactor: row.scale_factor as number,
        offset: row.offset as number,
      }));

      for (const mapping of this.mappings) {
        tagDatabase.registerTag(mapping.tagAddress, {
          address: mapping.tagAddress,
          dataType: mapping.dataType,
          accessMode: mapping.accessMode,
          scaleFactor: mapping.scaleFactor,
          offset: mapping.offset,
          description: mapping.objectName,
        });
      }
    } catch {
      log.debug('No tag mappings loaded from database');
    }
  }

  private setupMqttToTagBridge(): void {
    const mqttMappings = this.mappings.filter(m => m.protocol === 'MQTT');
    for (const mapping of mqttMappings) {
      mqttBroker.subscribe(mapping.tagAddress, 1, (_topic, payload) => {
        try {
          const value = JSON.parse(payload.toString());
          tagDatabase.writeTag(mapping.tagAddress, value, 'mqtt-bridge');
          this.syncStats.mqttToTag++;
        } catch {
          tagDatabase.writeTag(mapping.tagAddress, payload.toString(), 'mqtt-bridge');
          this.syncStats.mqttToTag++;
        }
      });
    }

    if (mqttMappings.length > 0) {
      log.info(`MQTT→Tag bridge: ${mqttMappings.length} subscriptions`);
    }
  }

  private setupTagToMqttBridge(): void {
    tagDatabase.on('tag:changed', (address: string, tagValue: TagValue) => {
      if (tagValue.source === 'mqtt-bridge' || tagValue.source === 'mqtt') return;

      const mapping = this.mappings.find(m => m.tagAddress === address && m.protocol === 'MQTT');
      if (mapping && mapping.accessMode !== 'READ') {
        mqttBroker.publish(address, tagValue.value, 0);
        this.syncStats.tagToMqtt++;
      }
    });
  }

  private setupModbusIntegration(): void {
    const modbusMappings = this.mappings.filter(m => m.protocol === 'MODBUS_TCP');
    let registerAddr = 0;

    for (const mapping of modbusMappings) {
      if (mapping.modbusRegister !== undefined) {
        modbusServer.mapRegisterToTag(mapping.modbusRegister, mapping.tagAddress);
      } else {
        modbusServer.mapRegisterToTag(registerAddr, mapping.tagAddress);
        registerAddr += 2;
      }
    }

    if (modbusMappings.length > 0) {
      log.info(`Modbus bridge: ${modbusMappings.length} register mappings`);
    }
  }

  addMapping(mapping: Omit<ProtocolMapping, 'id'>): void {
    const fullMapping: ProtocolMapping = { ...mapping, id: '' };
    this.mappings.push(fullMapping);

    tagDatabase.registerTag(mapping.tagAddress, {
      address: mapping.tagAddress,
      dataType: mapping.dataType,
      accessMode: mapping.accessMode,
      scaleFactor: mapping.scaleFactor,
      offset: mapping.offset,
      description: mapping.objectName,
    });

    if (mapping.protocol === 'MQTT' && mapping.mqttTopic) {
      mqttBroker.subscribe(mapping.mqttTopic, 1);
    }
    if (mapping.protocol === 'MODBUS_TCP' && mapping.modbusRegister !== undefined) {
      modbusServer.mapRegisterToTag(mapping.modbusRegister, mapping.tagAddress);
    }
  }

  removeMapping(tagAddress: string): void {
    const mapping = this.mappings.find(m => m.tagAddress === tagAddress);
    if (mapping) {
      if (mapping.mqttTopic) mqttBroker.unsubscribe(mapping.mqttTopic);
      tagDatabase.unregisterTag(tagAddress);
      this.mappings = this.mappings.filter(m => m.tagAddress !== tagAddress);
    }
  }

  getMappings(): ProtocolMapping[] {
    return [...this.mappings];
  }

  getSyncStats() {
    return { ...this.syncStats };
  }

  reloadMappings(): void {
    this.mappings = [];
    this.loadMappingsFromDb();
    log.info(`Data bridge reloaded: ${this.mappings.length} mappings`);
  }

  private countProtocols(): number {
    return new Set(this.mappings.map(m => m.protocol)).size;
  }
}

export const dataBridge = new DataBridge();
