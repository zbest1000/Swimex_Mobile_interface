import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { config } from '../utils/config';
import { tagDatabase } from '../tags/tag-database';
import { mqttBroker } from '../mqtt/mqtt-broker';

const log = createLogger('simulator');

export interface SimulatorConfig {
  updateIntervalMs: number;
  mqttPublishIntervalMs: number;
  modbusEnabled: boolean;
  mqttEnabled: boolean;
  maxSpeed: number;
  rampRatePerSecond: number;
  motorTempAmbient: number;
  motorTempMaxRise: number;
  faultProbability: number;
}

const DEFAULT_SIM_CONFIG: SimulatorConfig = {
  updateIntervalMs: parseInt(process.env.SIM_UPDATE_INTERVAL ?? '250', 10),
  mqttPublishIntervalMs: parseInt(process.env.SIM_MQTT_INTERVAL ?? '1000', 10),
  modbusEnabled: process.env.SIM_MODBUS !== 'false',
  mqttEnabled: process.env.SIM_MQTT !== 'false',
  maxSpeed: 100,
  rampRatePerSecond: 10,
  motorTempAmbient: 25,
  motorTempMaxRise: 45,
  faultProbability: 0.0001,
};

interface SimState {
  currentSpeed: number;
  targetSpeed: number;
  motorTemp: number;
  state: 'IDLE' | 'RUNNING' | 'PAUSED' | 'SAFETY_STOP' | 'FAULT';
  elapsedTime: number;
  faultCodes: number[];
  startTime: number;
}

/**
 * PLC Simulator — generates realistic pool equipment data for testing.
 * Publishes via MQTT and writes directly to the Tag Database.
 * Responds to commands (start, stop, pause, speed changes).
 */
export class PlcSimulator extends EventEmitter {
  private simConfig: SimulatorConfig;
  private simState: SimState;
  private updateTimer: NodeJS.Timeout | null = null;
  private mqttTimer: NodeJS.Timeout | null = null;
  private keepAliveTimer: NodeJS.Timeout | null = null;
  private running = false;
  private poolId: string;

  constructor(cfg?: Partial<SimulatorConfig>) {
    super();
    this.simConfig = { ...DEFAULT_SIM_CONFIG, ...cfg };
    this.poolId = config.poolId;
    this.simState = {
      currentSpeed: 0,
      targetSpeed: 0,
      motorTemp: this.simConfig.motorTempAmbient,
      state: 'IDLE',
      elapsedTime: 0,
      faultCodes: [],
      startTime: Date.now(),
    };
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    this.setupCommandListener();

    this.updateTimer = setInterval(() => this.updateSimulation(), this.simConfig.updateIntervalMs);

    if (this.simConfig.mqttEnabled) {
      this.mqttTimer = setInterval(() => this.publishMqttStatus(), this.simConfig.mqttPublishIntervalMs);
      this.keepAliveTimer = setInterval(() => this.sendKeepAlive(), 2000);
    }

    log.info(`PLC simulator started (update: ${this.simConfig.updateIntervalMs}ms, mqtt: ${this.simConfig.mqttEnabled}, modbus: ${this.simConfig.modbusEnabled})`);
  }

  private setupCommandListener(): void {
    tagDatabase.on('tag:changed', (address: string, tagValue: { value: unknown; source: string }) => {
      if (tagValue.source === 'simulator') return;

      const prefix = `swimex/${this.poolId}/command`;
      if (!address.startsWith(prefix)) return;

      const cmd = address.replace(`${prefix}/`, '');
      this.handleCommand(cmd, tagValue.value);
    });

    mqttBroker.on('message', (topic: string, value: unknown) => {
      const prefix = `swimex/${this.poolId}/command`;
      if (!topic.startsWith(prefix)) return;

      const cmd = topic.replace(`${prefix}/`, '');
      this.handleCommand(cmd, value);
    });
  }

  private handleCommand(cmd: string, value: unknown): void {
    log.info(`Simulator received command: ${cmd} = ${JSON.stringify(value)}`);

    switch (cmd) {
      case 'start':
        if (this.simState.state === 'IDLE' || this.simState.state === 'PAUSED') {
          this.simState.state = 'RUNNING';
          this.simState.startTime = Date.now();
          if (this.simState.targetSpeed === 0) this.simState.targetSpeed = 30;
          log.info('Simulator: motor STARTED');
        }
        break;

      case 'stop':
        this.simState.state = 'IDLE';
        this.simState.targetSpeed = 0;
        log.info('Simulator: motor STOPPED');
        break;

      case 'pause':
        if (this.simState.state === 'RUNNING') {
          this.simState.state = 'PAUSED';
          log.info('Simulator: motor PAUSED');
        }
        break;

      case 'resume':
        if (this.simState.state === 'PAUSED') {
          this.simState.state = 'RUNNING';
          log.info('Simulator: motor RESUMED');
        }
        break;

      case 'speed': {
        const speed = typeof value === 'number' ? value :
                      typeof value === 'object' && value !== null ? (value as any).speed ?? (value as any).value ?? 0 :
                      parseFloat(String(value)) || 0;
        this.simState.targetSpeed = Math.max(0, Math.min(this.simConfig.maxSpeed, speed));
        if (this.simState.state === 'IDLE' && speed > 0) {
          this.simState.state = 'RUNNING';
          this.simState.startTime = Date.now();
        }
        log.info(`Simulator: target speed set to ${this.simState.targetSpeed}%`);
        break;
      }
    }
  }

  private updateSimulation(): void {
    const dt = this.simConfig.updateIntervalMs / 1000;
    const state = this.simState;

    // Speed ramping
    if (state.state === 'RUNNING' || state.state === 'IDLE') {
      const effectiveTarget = state.state === 'IDLE' ? 0 : state.targetSpeed;
      const diff = effectiveTarget - state.currentSpeed;
      const maxDelta = this.simConfig.rampRatePerSecond * dt;

      if (Math.abs(diff) <= maxDelta) {
        state.currentSpeed = effectiveTarget;
      } else {
        state.currentSpeed += Math.sign(diff) * maxDelta;
      }
    } else if (state.state === 'PAUSED') {
      // Slow coast-down when paused
      state.currentSpeed = Math.max(0, state.currentSpeed - this.simConfig.rampRatePerSecond * 0.5 * dt);
    } else if (state.state === 'SAFETY_STOP' || state.state === 'FAULT') {
      state.currentSpeed = Math.max(0, state.currentSpeed - this.simConfig.rampRatePerSecond * 3 * dt);
    }

    // Motor temperature model
    const heatInput = (state.currentSpeed / this.simConfig.maxSpeed) * this.simConfig.motorTempMaxRise;
    const targetTemp = this.simConfig.motorTempAmbient + heatInput;
    state.motorTemp += (targetTemp - state.motorTemp) * 0.01;
    state.motorTemp += (Math.random() - 0.5) * 0.1;

    // Elapsed time
    if (state.state === 'RUNNING') {
      state.elapsedTime = Date.now() - state.startTime;
    }

    // Random fault injection
    if (Math.random() < this.simConfig.faultProbability && state.state === 'RUNNING') {
      const faultCode = Math.floor(Math.random() * 10) + 1;
      state.faultCodes = [faultCode];
      state.state = 'FAULT';
      log.warn(`Simulator: FAULT injected (code: ${faultCode})`);
    }

    // Auto-recover from fault after 5 seconds
    if (state.state === 'FAULT' && state.currentSpeed <= 0.1) {
      state.faultCodes = [];
      state.state = 'IDLE';
      state.currentSpeed = 0;
    }

    // Write to tag database
    const prefix = `swimex/${this.poolId}`;
    tagDatabase.writeTag(`${prefix}/status/current_speed`, Math.round(state.currentSpeed * 100) / 100, 'simulator');
    tagDatabase.writeTag(`${prefix}/status/target_speed`, state.targetSpeed, 'simulator');
    tagDatabase.writeTag(`${prefix}/status/state`, state.state, 'simulator');
    tagDatabase.writeTag(`${prefix}/status/motor_temp`, Math.round(state.motorTemp * 10) / 10, 'simulator');
    tagDatabase.writeTag(`${prefix}/status/elapsed_time`, state.elapsedTime, 'simulator');
    tagDatabase.writeTag(`${prefix}/status/fault_codes`, JSON.stringify(state.faultCodes), 'simulator');
  }

  private publishMqttStatus(): void {
    if (!mqttBroker.isConnected()) return;

    const state = this.simState;
    const status = {
      state: state.state,
      currentSpeed: Math.round(state.currentSpeed * 100) / 100,
      targetSpeed: state.targetSpeed,
      motorTemp: Math.round(state.motorTemp * 10) / 10,
      elapsedTime: state.elapsedTime,
      faultCodes: state.faultCodes,
      timestamp: Date.now(),
      source: 'simulator',
    };

    mqttBroker.publishStatus('pool', status, false);
  }

  private sendKeepAlive(): void {
    if (!mqttBroker.isConnected()) return;

    const msg = {
      type: 'pong',
      timestamp: Date.now(),
      source: 'plc',
      sequenceNumber: 0,
    };

    mqttBroker.publish(`swimex/${this.poolId}/keepalive`, msg, 1);
  }

  getState(): SimState {
    return { ...this.simState };
  }

  setSpeed(speed: number): void {
    this.handleCommand('speed', speed);
  }

  startMotor(): void {
    this.handleCommand('start', true);
  }

  stopMotor(): void {
    this.handleCommand('stop', true);
  }

  injectFault(code: number): void {
    this.simState.faultCodes = [code];
    this.simState.state = 'FAULT';
    log.info(`Simulator: manual fault injected (code: ${code})`);
  }

  clearFault(): void {
    this.simState.faultCodes = [];
    this.simState.state = 'IDLE';
    this.simState.currentSpeed = 0;
    log.info('Simulator: fault cleared');
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.updateTimer) { clearInterval(this.updateTimer); this.updateTimer = null; }
    if (this.mqttTimer) { clearInterval(this.mqttTimer); this.mqttTimer = null; }
    if (this.keepAliveTimer) { clearInterval(this.keepAliveTimer); this.keepAliveTimer = null; }

    log.info('PLC simulator stopped');
  }

  isRunning(): boolean {
    return this.running;
  }
}
