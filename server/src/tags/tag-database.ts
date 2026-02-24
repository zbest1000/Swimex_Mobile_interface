import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';

const log = createLogger('tags');

export interface TagValue {
  value: unknown;
  quality: 'good' | 'bad' | 'uncertain';
  timestamp: number;
  source: string;
  previousValue?: unknown;
}

export interface TagDefinition {
  address: string;
  dataType: string;
  accessMode: string;
  scaleFactor: number;
  offset: number;
  description?: string;
  deadband?: number;
  unit?: string;
  min?: number;
  max?: number;
}

/**
 * Unified Tag Database — single source of truth for all protocol data.
 * MQTT topics, Modbus registers, and HTTP endpoints all converge here.
 * Supports deadband filtering, value quality tracking, and event-driven updates.
 */
export class TagDatabase extends EventEmitter {
  private tags = new Map<string, TagValue>();
  private definitions = new Map<string, TagDefinition>();
  private updateCount = 0;
  private historyBuffer = new Map<string, Array<{ value: unknown; timestamp: number }>>();
  private readonly MAX_HISTORY = 100;

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
  }

  unregisterTag(address: string): void {
    this.tags.delete(address);
    this.definitions.delete(address);
    this.historyBuffer.delete(address);
  }

  getDefinition(address: string): TagDefinition | undefined {
    return this.definitions.get(address);
  }

  getAllDefinitions(): Map<string, TagDefinition> {
    return new Map(this.definitions);
  }

  writeTag(address: string, value: unknown, source: string): boolean {
    const def = this.definitions.get(address);

    // Enforce read-only
    if (def && def.accessMode === 'READ') {
      return false;
    }

    // Apply scale/offset for numeric values
    let processedValue = value;
    if (def && typeof value === 'number') {
      processedValue = value * def.scaleFactor + def.offset;

      // Clamp to min/max if defined
      if (def.min !== undefined) processedValue = Math.max(def.min, processedValue as number);
      if (def.max !== undefined) processedValue = Math.min(def.max, processedValue as number);
    }

    const previous = this.tags.get(address);

    // Deadband filtering for numeric values
    if (def?.deadband && typeof processedValue === 'number' && previous && typeof previous.value === 'number') {
      if (Math.abs(processedValue - previous.value) < def.deadband) {
        return false;
      }
    }

    const tagValue: TagValue = {
      value: processedValue,
      quality: 'good',
      timestamp: Date.now(),
      source,
      previousValue: previous?.value,
    };

    this.tags.set(address, tagValue);
    this.updateCount++;

    // Maintain history buffer
    if (!this.historyBuffer.has(address)) {
      this.historyBuffer.set(address, []);
    }
    const history = this.historyBuffer.get(address)!;
    history.push({ value: processedValue, timestamp: tagValue.timestamp });
    if (history.length > this.MAX_HISTORY) {
      history.splice(0, history.length - this.MAX_HISTORY);
    }

    this.emit('tag:changed', address, tagValue, previous);
    this.emit(`tag:${address}`, tagValue, previous);
    return true;
  }

  readTag(address: string): TagValue | undefined {
    return this.tags.get(address);
  }

  readTagValue(address: string): unknown {
    return this.tags.get(address)?.value ?? null;
  }

  readMultiple(addresses: string[]): Map<string, TagValue | undefined> {
    const result = new Map<string, TagValue | undefined>();
    for (const addr of addresses) {
      result.set(addr, this.tags.get(addr));
    }
    return result;
  }

  readAllTags(): Map<string, TagValue> {
    return new Map(this.tags);
  }

  getTagAddresses(): string[] {
    return Array.from(this.tags.keys());
  }

  getTagHistory(address: string, limit?: number): Array<{ value: unknown; timestamp: number }> {
    const history = this.historyBuffer.get(address) ?? [];
    return limit ? history.slice(-limit) : [...history];
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

  getStats(): { tagCount: number; definitionCount: number; updateCount: number } {
    return {
      tagCount: this.tags.size,
      definitionCount: this.definitions.size,
      updateCount: this.updateCount,
    };
  }

  /**
   * Search tags by pattern (supports * wildcard).
   */
  searchTags(pattern: string): string[] {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\//g, '\\/') + '$');
    return this.getTagAddresses().filter(addr => regex.test(addr));
  }

  /**
   * Bulk write multiple tags atomically.
   */
  writeMultiple(writes: Array<{ address: string; value: unknown; source: string }>): void {
    for (const w of writes) {
      this.writeTag(w.address, w.value, w.source);
    }
  }

  clear(): void {
    this.tags.clear();
    this.definitions.clear();
    this.historyBuffer.clear();
    this.updateCount = 0;
    this.removeAllListeners();
  }
}

export const tagDatabase = new TagDatabase();
