import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';

const log = createLogger('tags');

export interface TagValue {
  value: unknown;
  quality: 'good' | 'bad' | 'uncertain';
  timestamp: number;
  source: string;
}

export interface TagDefinition {
  address: string;
  dataType: string;
  accessMode: string;
  scaleFactor: number;
  offset: number;
  description?: string;
}

/**
 * Unified Tag Database — single source of truth for all protocol data.
 * MQTT topics, Modbus registers, and HTTP endpoints all read/write through this store.
 */
export class TagDatabase extends EventEmitter {
  private tags = new Map<string, TagValue>();
  private definitions = new Map<string, TagDefinition>();

  registerTag(address: string, definition: TagDefinition): void {
    this.definitions.set(address, definition);
    if (!this.tags.has(address)) {
      this.tags.set(address, {
        value: null,
        quality: 'uncertain',
        timestamp: Date.now(),
        source: 'init',
      });
    }
    log.debug(`Tag registered: ${address}`);
  }

  unregisterTag(address: string): void {
    this.tags.delete(address);
    this.definitions.delete(address);
  }

  getDefinition(address: string): TagDefinition | undefined {
    return this.definitions.get(address);
  }

  getAllDefinitions(): Map<string, TagDefinition> {
    return new Map(this.definitions);
  }

  writeTag(address: string, value: unknown, source: string): void {
    const def = this.definitions.get(address);
    if (def && (def.accessMode === 'READ')) {
      log.warn(`Attempted write to read-only tag: ${address}`);
      return;
    }

    let processedValue = value;
    if (def && typeof value === 'number') {
      processedValue = value * def.scaleFactor + def.offset;
    }

    const tagValue: TagValue = {
      value: processedValue,
      quality: 'good',
      timestamp: Date.now(),
      source,
    };

    const previous = this.tags.get(address);
    this.tags.set(address, tagValue);

    this.emit('tag:changed', address, tagValue, previous);
    this.emit(`tag:${address}`, tagValue, previous);
  }

  readTag(address: string): TagValue | undefined {
    return this.tags.get(address);
  }

  readTagValue(address: string): unknown {
    return this.tags.get(address)?.value ?? null;
  }

  readAllTags(): Map<string, TagValue> {
    return new Map(this.tags);
  }

  getTagAddresses(): string[] {
    return Array.from(this.tags.keys());
  }

  setTagQuality(address: string, quality: 'good' | 'bad' | 'uncertain', source: string): void {
    const tag = this.tags.get(address);
    if (tag) {
      tag.quality = quality;
      tag.source = source;
      tag.timestamp = Date.now();
      this.emit('tag:quality', address, quality);
    }
  }

  clear(): void {
    this.tags.clear();
    this.definitions.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
export const tagDatabase = new TagDatabase();
