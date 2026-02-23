"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagDatabase = exports.TagDatabase = void 0;
const events_1 = require("events");
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createLogger)('tags');
/**
 * Unified Tag Database — single source of truth for all protocol data.
 * MQTT topics, Modbus registers, and HTTP endpoints all read/write through this store.
 */
class TagDatabase extends events_1.EventEmitter {
    tags = new Map();
    definitions = new Map();
    registerTag(address, definition) {
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
    unregisterTag(address) {
        this.tags.delete(address);
        this.definitions.delete(address);
    }
    getDefinition(address) {
        return this.definitions.get(address);
    }
    getAllDefinitions() {
        return new Map(this.definitions);
    }
    writeTag(address, value, source) {
        const def = this.definitions.get(address);
        if (def && (def.accessMode === 'READ')) {
            log.warn(`Attempted write to read-only tag: ${address}`);
            return;
        }
        let processedValue = value;
        if (def && typeof value === 'number') {
            processedValue = value * def.scaleFactor + def.offset;
        }
        const tagValue = {
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
    readTag(address) {
        return this.tags.get(address);
    }
    readTagValue(address) {
        return this.tags.get(address)?.value ?? null;
    }
    readAllTags() {
        return new Map(this.tags);
    }
    getTagAddresses() {
        return Array.from(this.tags.keys());
    }
    setTagQuality(address, quality, source) {
        const tag = this.tags.get(address);
        if (tag) {
            tag.quality = quality;
            tag.source = source;
            tag.timestamp = Date.now();
            this.emit('tag:quality', address, quality);
        }
    }
    clear() {
        this.tags.clear();
        this.definitions.clear();
        this.removeAllListeners();
    }
}
exports.TagDatabase = TagDatabase;
// Singleton instance
exports.tagDatabase = new TagDatabase();
//# sourceMappingURL=tag-database.js.map