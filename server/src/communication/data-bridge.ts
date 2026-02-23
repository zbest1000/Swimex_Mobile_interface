import { EventEmitter } from 'events';
import { tagDatabase, TagValue } from '../tags/tag-database';
import { mqttBroker } from '../mqtt/mqtt-broker';
import { modbusServer } from '../modbus/modbus-server';
import { createLogger } from '../utils/logger';
import { getDb } from '../database/connection';

const log = createLogger('data-bridge');

interface TagMapping {
  tagAddress: string;
  protocol: string;
  modbusRegister?: number;
  mqttTopic?: string;
  httpEndpoint?: string;
}

/**
 * Internal Data Bridge — synchronizes data between MQTT, Modbus TCP, and HTTP
 * via the unified Tag Database.
 */
export class DataBridge extends EventEmitter {
  private mappings: TagMapping[] = [];
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;

    this.loadMappingsFromDb();
    this.setupBridgeListeners();
    this.initialized = true;
    log.info(`Data bridge initialized with ${this.mappings.length} mappings`);
  }

  private loadMappingsFromDb(): void {
    try {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM object_tag_mappings').all() as Record<string, unknown>[];

      this.mappings = rows.map(row => ({
        tagAddress: row.tag_address as string,
        protocol: row.protocol as string,
        modbusRegister: row.protocol === 'MODBUS_TCP' ? parseInt(row.tag_address as string, 10) : undefined,
        mqttTopic: row.protocol === 'MQTT' ? row.tag_address as string : undefined,
        httpEndpoint: row.protocol === 'HTTP' ? row.tag_address as string : undefined,
      }));

      // Register tags and Modbus mappings
      for (const mapping of this.mappings) {
        tagDatabase.registerTag(mapping.tagAddress, {
          address: mapping.tagAddress,
          dataType: 'FLOAT32',
          accessMode: 'READ_WRITE',
          scaleFactor: 1.0,
          offset: 0,
        });

        if (mapping.modbusRegister !== undefined) {
          modbusServer.mapRegisterToTag(mapping.modbusRegister, mapping.tagAddress);
        }
      }
    } catch {
      log.warn('No tag mappings loaded (database may not have mappings yet)');
    }
  }

  private setupBridgeListeners(): void {
    tagDatabase.on('tag:changed', (address: string, tagValue: TagValue) => {
      this.emit('tag:update', address, tagValue);
    });
  }

  addMapping(mapping: TagMapping): void {
    this.mappings.push(mapping);
    tagDatabase.registerTag(mapping.tagAddress, {
      address: mapping.tagAddress,
      dataType: 'FLOAT32',
      accessMode: 'READ_WRITE',
      scaleFactor: 1.0,
      offset: 0,
    });

    if (mapping.modbusRegister !== undefined) {
      modbusServer.mapRegisterToTag(mapping.modbusRegister, mapping.tagAddress);
    }
  }

  removeMapping(tagAddress: string): void {
    this.mappings = this.mappings.filter(m => m.tagAddress !== tagAddress);
    tagDatabase.unregisterTag(tagAddress);
  }

  getMappings(): TagMapping[] {
    return [...this.mappings];
  }

  reloadMappings(): void {
    this.mappings = [];
    this.loadMappingsFromDb();
    log.info(`Data bridge reloaded with ${this.mappings.length} mappings`);
  }
}

export const dataBridge = new DataBridge();
