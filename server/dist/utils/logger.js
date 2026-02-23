"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLogLevel = setLogLevel;
exports.createLogger = createLogger;
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
let currentLevel = 'info';
function setLogLevel(level) {
    currentLevel = level;
}
function shouldLog(level) {
    return LEVELS[level] >= LEVELS[currentLevel];
}
function formatTimestamp() {
    return new Date().toISOString();
}
function formatMessage(level, module, msg, data) {
    const base = `[${formatTimestamp()}] [${level.toUpperCase().padEnd(5)}] [${module}] ${msg}`;
    if (data !== undefined) {
        return `${base} ${JSON.stringify(data)}`;
    }
    return base;
}
function createLogger(module) {
    return {
        debug: (msg, data) => {
            if (shouldLog('debug'))
                console.debug(formatMessage('debug', module, msg, data));
        },
        info: (msg, data) => {
            if (shouldLog('info'))
                console.log(formatMessage('info', module, msg, data));
        },
        warn: (msg, data) => {
            if (shouldLog('warn'))
                console.warn(formatMessage('warn', module, msg, data));
        },
        error: (msg, data) => {
            if (shouldLog('error'))
                console.error(formatMessage('error', module, msg, data));
        },
    };
}
//# sourceMappingURL=logger.js.map