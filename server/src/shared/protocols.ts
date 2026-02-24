// SwimEx EDGE — Protocol Message Definitions

export interface MqttTopics {
  commandPrefix: string;
  statusPrefix: string;
  keepAlive: string;
}

export const DEFAULT_TOPICS = (poolId: string = 'default'): MqttTopics => ({
  commandPrefix: `swimex/${poolId}/command`,
  statusPrefix: `swimex/${poolId}/status`,
  keepAlive: `swimex/${poolId}/keepalive`,
});

export interface KeepAliveMessage {
  type: 'ping' | 'pong';
  timestamp: number;
  source: 'server' | 'client' | 'plc';
  sequenceNumber: number;
}

export interface PoolCommand {
  command: 'START' | 'STOP' | 'PAUSE' | 'SET_SPEED' | 'RESUME';
  speed?: number;
  source: 'tablet' | 'browser' | 'air_button' | 'modbus' | 'api';
  timestamp: number;
  userId?: string;
}

export interface PoolStatus {
  state: 'IDLE' | 'RUNNING' | 'PAUSED' | 'SAFETY_STOP' | 'FAULT';
  currentSpeed: number;
  targetSpeed: number;
  motorTemp: number | null;
  elapsedTime: number;
  faultCodes: number[];
  timestamp: number;
}

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}

export interface WSPoolUpdate extends WebSocketMessage {
  type: 'pool_status';
  payload: PoolStatus;
}

export interface WSWorkoutUpdate extends WebSocketMessage {
  type: 'workout_update';
  payload: {
    state: string;
    currentStep: number;
    currentSet: number;
    totalSteps: number;
    totalSets: number;
    stepElapsed: number;
    totalElapsed: number;
    speed: number;
  };
}

export interface WSKeepAlive extends WebSocketMessage {
  type: 'keepalive';
  payload: KeepAliveMessage;
}

export interface WSConnectionStatus extends WebSocketMessage {
  type: 'connection_status';
  payload: {
    serverToPlc: boolean;
    clientToServer: boolean;
    plcHeartbeatMs: number | null;
  };
}

export interface WSAuthRequired extends WebSocketMessage {
  type: 'auth_required';
  payload: null;
}

export interface WSError extends WebSocketMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

export const API_ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  DEVICE_NOT_REGISTERED: 'DEVICE_NOT_REGISTERED',
  VIEW_ONLY: 'VIEW_ONLY',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  COMMISSIONING_CODE_INVALID: 'COMMISSIONING_CODE_INVALID',
  COMMISSIONING_CODE_LOCKOUT: 'COMMISSIONING_CODE_LOCKOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  PLC_DISCONNECTED: 'PLC_DISCONNECTED',
  SAFETY_STOP_ACTIVE: 'SAFETY_STOP_ACTIVE',
} as const;
