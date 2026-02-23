export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[currentLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, module: string, msg: string, data?: unknown): string {
  const base = `[${formatTimestamp()}] [${level.toUpperCase().padEnd(5)}] [${module}] ${msg}`;
  if (data !== undefined) {
    return `${base} ${JSON.stringify(data)}`;
  }
  return base;
}

export function createLogger(module: string) {
  return {
    debug: (msg: string, data?: unknown) => {
      if (shouldLog('debug')) console.debug(formatMessage('debug', module, msg, data));
    },
    info: (msg: string, data?: unknown) => {
      if (shouldLog('info')) console.log(formatMessage('info', module, msg, data));
    },
    warn: (msg: string, data?: unknown) => {
      if (shouldLog('warn')) console.warn(formatMessage('warn', module, msg, data));
    },
    error: (msg: string, data?: unknown) => {
      if (shouldLog('error')) console.error(formatMessage('error', module, msg, data));
    },
  };
}
