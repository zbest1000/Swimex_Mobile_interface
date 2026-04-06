import fs from 'fs';
import path from 'path';

export type LogLevel = 'debug' | 'info' | 'security' | 'warn' | 'error' | 'fatal';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  security: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',    // cyan
  info: '\x1b[32m',     // green
  security: '\x1b[35m', // magenta
  warn: '\x1b[33m',     // yellow
  error: '\x1b[31m',    // red
  fatal: '\x1b[41m',    // red background
};
const RESET = '\x1b[0m';

let currentLevel: LogLevel = 'info';
let logFilePath: string | null = null;
let logStream: fs.WriteStream | null = null;
let logFormat: 'text' | 'json' = 'text';
let maxFileSize = 10 * 1024 * 1024; // 10 MB default
let maxFiles = 5;
let currentFileSize = 0;

function disableFileLogging(reason: string, err?: unknown): void {
  const message = err instanceof Error ? `${reason}: ${err.message}` : reason;
  console.error(`[LOGGER] File logging disabled - ${message}`);
  if (logStream) {
    try { logStream.destroy(); } catch { /* best effort */ }
  }
  logStream = null;
  logFilePath = null;
}

export function setLogLevel(level: LogLevel | string): void {
  if (level in LEVELS) {
    currentLevel = level as LogLevel;
  }
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

export function configureFileLogging(options: {
  filePath: string;
  format?: 'text' | 'json';
  maxSizeMB?: number;
  maxFiles?: number;
}): void {
  logFilePath = options.filePath;
  logFormat = options.format ?? 'text';
  maxFileSize = (options.maxSizeMB ?? 10) * 1024 * 1024;
  maxFiles = options.maxFiles ?? 5;

  const dir = path.dirname(logFilePath);
  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  } catch (err) {
    disableFileLogging(`could not create log directory "${dir}"`, err);
    return;
  }

  openLogFile();
}

function openLogFile(): void {
  if (!logFilePath) return;
  try {
    if (fs.existsSync(logFilePath)) {
      currentFileSize = fs.statSync(logFilePath).size;
    } else {
      currentFileSize = 0;
    }
    const stream = fs.createWriteStream(logFilePath, { flags: 'a', mode: 0o640 });
    stream.on('error', (err) => {
      if (logStream === stream) {
        disableFileLogging('stream write failure', err);
      }
    });
    logStream = stream;
  } catch (err) {
    disableFileLogging(`could not open log file "${logFilePath}"`, err);
  }
}

function rotateLogFile(): void {
  if (!logFilePath || !logStream) return;
  logStream.end();

  for (let i = maxFiles - 1; i >= 1; i--) {
    const from = i === 1 ? logFilePath : `${logFilePath}.${i - 1}`;
    const to = `${logFilePath}.${i}`;
    try {
      if (fs.existsSync(from)) fs.renameSync(from, to);
    } catch { /* best effort */ }
  }

  currentFileSize = 0;
  openLogFile();
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[currentLevel];
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
  requestId?: string;
  userId?: string;
  ip?: string;
}

function formatText(entry: LogEntry): string {
  const lvl = entry.level.toUpperCase().padEnd(8);
  let line = `[${entry.timestamp}] [${lvl}] [${entry.module}] ${entry.message}`;
  if (entry.userId) line += ` userId=${entry.userId}`;
  if (entry.ip) line += ` ip=${entry.ip}`;
  if (entry.requestId) line += ` reqId=${entry.requestId}`;
  if (entry.data !== undefined) {
    const str = typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data);
    line += ` ${str}`;
  }
  return line;
}

function formatJson(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function formatConsole(entry: LogEntry): string {
  const color = LEVEL_COLORS[entry.level] ?? '';
  const lvl = entry.level.toUpperCase().padEnd(8);
  let line = `[${entry.timestamp}] ${color}[${lvl}]${RESET} [${entry.module}] ${entry.message}`;
  if (entry.userId) line += ` userId=${entry.userId}`;
  if (entry.ip) line += ` ip=${entry.ip}`;
  if (entry.data !== undefined) {
    const str = typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data);
    line += ` ${str}`;
  }
  return line;
}

function writeEntry(entry: LogEntry): void {
  const consoleLine = process.stdout.isTTY ? formatConsole(entry) : formatText(entry);

  if (entry.level === 'error' || entry.level === 'fatal') {
    console.error(consoleLine);
  } else if (entry.level === 'warn' || entry.level === 'security') {
    console.warn(consoleLine);
  } else if (entry.level === 'debug') {
    console.debug(consoleLine);
  } else {
    console.log(consoleLine);
  }

  if (logStream && logFilePath) {
    const fileLine = logFormat === 'json' ? formatJson(entry) : formatText(entry);
    const bytes = Buffer.byteLength(fileLine + '\n', 'utf8');
    if (currentFileSize + bytes > maxFileSize) {
      rotateLogFile();
    }
    if (logStream) {
      logStream.write(fileLine + '\n');
      currentFileSize += bytes;
    }
  }
}

export interface Logger {
  debug: (msg: string, data?: unknown) => void;
  info: (msg: string, data?: unknown) => void;
  security: (msg: string, data?: unknown) => void;
  warn: (msg: string, data?: unknown) => void;
  error: (msg: string, data?: unknown) => void;
  fatal: (msg: string, data?: unknown) => void;
  child: (context: { requestId?: string; userId?: string; ip?: string }) => Logger;
}

export function createLogger(module: string, context?: { requestId?: string; userId?: string; ip?: string }): Logger {
  function emit(level: LogLevel, msg: string, data?: unknown): void {
    if (!shouldLog(level)) return;
    writeEntry({
      timestamp: new Date().toISOString(),
      level,
      module,
      message: msg,
      data,
      requestId: context?.requestId,
      userId: context?.userId,
      ip: context?.ip,
    });
  }

  return {
    debug: (msg, data?) => emit('debug', msg, data),
    info: (msg, data?) => emit('info', msg, data),
    security: (msg, data?) => emit('security', msg, data),
    warn: (msg, data?) => emit('warn', msg, data),
    error: (msg, data?) => emit('error', msg, data),
    fatal: (msg, data?) => emit('fatal', msg, data),
    child: (ctx) => createLogger(module, { ...context, ...ctx }),
  };
}

export function closeLogger(): void {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
}
