/**
 * Integration test: Embedded MQTT Broker + Modbus TCP + PLC Simulator
 * 
 * Run: npx ts-node tests/integration/broker-modbus-simulator.test.ts
 * 
 * Tests:
 *  1. Embedded Aedes MQTT broker starts and accepts connections
 *  2. MQTT pub/sub works through the embedded broker
 *  3. Modbus TCP server accepts connections and handles read/write
 *  4. PLC simulator publishes data and responds to commands
 *  5. Tag database receives updates from all sources
 */

import { EmbeddedMqttBroker } from '../../src/mqtt/embedded-broker';
import { ModbusTcpServer } from '../../src/modbus/modbus-server';
import { PlcSimulator } from '../../src/simulator/plc-simulator';
import { TagDatabase } from '../../src/tags/tag-database';
import mqtt from 'mqtt';
import ModbusRTU from 'modbus-serial';

const MQTT_PORT = 18850;
const MQTT_WS_PORT = 9050;
const MODBUS_PORT = 5050;

let broker: EmbeddedMqttBroker;
let modbusServer: ModbusTcpServer;
let simulator: PlcSimulator;
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.error(`  ❌ ${name}`);
    failed++;
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function testEmbeddedBroker() {
  console.log('\n── Test 1: Embedded MQTT Broker ──');

  broker = new EmbeddedMqttBroker({
    port: MQTT_PORT,
    wsPort: MQTT_WS_PORT,
    authenticate: false,
  });

  await broker.start();
  assert(broker.isRunning(), 'Broker is running');
  assert(broker.getPort() === MQTT_PORT, `Broker listening on port ${MQTT_PORT}`);
}

async function testMqttPubSub() {
  console.log('\n── Test 2: MQTT Pub/Sub ──');

  return new Promise<void>((resolve) => {
    const sub = mqtt.connect(`mqtt://localhost:${MQTT_PORT}`, { clientId: 'test-sub' });
    let receivedMessage = false;

    sub.on('connect', () => {
      sub.subscribe('test/topic', { qos: 1 }, () => {
        // Small delay to let broker process the subscription fully
        setTimeout(() => {
          const pub = mqtt.connect(`mqtt://localhost:${MQTT_PORT}`, { clientId: 'test-pub' });
          pub.on('connect', () => {
            pub.publish('test/topic', JSON.stringify({ value: 42 }), { qos: 1 });
            setTimeout(() => pub.end(), 500);
          });
        }, 200);
      });
    });

    sub.on('message', (topic, payload) => {
      if (receivedMessage) return;
      const data = JSON.parse(payload.toString());
      receivedMessage = true;
      assert(topic === 'test/topic', 'Received on correct topic');
      assert(data.value === 42, 'Received correct payload');
      sub.end();
      resolve();
    });

    setTimeout(() => {
      if (!receivedMessage) {
        assert(false, 'MQTT message received within timeout');
        sub.end();
        resolve();
      }
    }, 5000);
  });
}

async function testModbusTcpServer() {
  console.log('\n── Test 3: Modbus TCP Server ──');

  const tagDb = require('../../src/tags/tag-database').tagDatabase as TagDatabase;

  tagDb.registerTag('modbus/test/speed', {
    address: 'modbus/test/speed',
    dataType: 'FLOAT32',
    accessMode: 'READ_WRITE',
    scaleFactor: 1,
    offset: 0,
  });

  modbusServer = new ModbusTcpServer();

  const origConfig = require('../../src/utils/config');
  const origPort = origConfig.config.modbusPort;
  origConfig.config.modbusPort = MODBUS_PORT;

  await modbusServer.start();
  assert(modbusServer.isRunning(), 'Modbus server is running');

  origConfig.config.modbusPort = origPort;

  const client = new ModbusRTU();
  await client.connectTCP('localhost', { port: MODBUS_PORT });
  client.setID(1);
  client.setTimeout(3000);

  const holdingData = await client.readHoldingRegisters(0, 5);
  assert(Array.isArray(holdingData.data), 'Read holding registers returns data');
  assert(holdingData.data.length === 5, 'Read 5 holding registers');

  await client.writeRegister(0, 100);
  const readBack = await client.readHoldingRegisters(0, 1);
  assert(readBack.data[0] === 100, 'Write and readback holding register');

  const coilsData = await client.readCoils(0, 8);
  assert(Array.isArray(coilsData.data), 'Read coils returns data');

  await client.writeCoil(0, true);
  const coilReadBack = await client.readCoils(0, 1);
  assert(coilReadBack.data[0] === true, 'Write and readback coil');

  client.close(() => {});
}

async function testSimulator() {
  console.log('\n── Test 4: PLC Simulator ──');

  const tagDb = require('../../src/tags/tag-database').tagDatabase as TagDatabase;

  simulator = new PlcSimulator({
    updateIntervalMs: 100,
    mqttEnabled: false,
    modbusEnabled: true,
  });

  await simulator.start();
  assert(simulator.isRunning(), 'Simulator is running');

  await sleep(500);
  const state = simulator.getState();
  assert(state.state === 'IDLE', 'Initial state is IDLE');
  assert(state.currentSpeed === 0, 'Initial speed is 0');

  simulator.startMotor();
  await sleep(200);
  const runState = simulator.getState();
  assert(runState.state === 'RUNNING', 'State changed to RUNNING after start');

  simulator.setSpeed(75);
  await sleep(1000);
  const speedState = simulator.getState();
  assert(speedState.targetSpeed === 75, 'Target speed set to 75');
  assert(speedState.currentSpeed > 0, `Current speed ramping up (${speedState.currentSpeed.toFixed(1)}%)`);

  simulator.stopMotor();
  await sleep(500);
  const stopState = simulator.getState();
  assert(stopState.state === 'IDLE', 'State changed to IDLE after stop');
  assert(stopState.targetSpeed === 0, 'Target speed is 0 after stop');
}

async function testTagDatabaseIntegration() {
  console.log('\n── Test 5: Tag Database Integration ──');

  const tagDb = require('../../src/tags/tag-database').tagDatabase as TagDatabase;

  const speedTag = tagDb.readTag('swimex/default/status/current_speed');
  assert(speedTag !== undefined, 'Simulator wrote speed tag');

  const stateTag = tagDb.readTag('swimex/default/status/state');
  assert(stateTag !== undefined, 'Simulator wrote state tag');

  const tempTag = tagDb.readTag('swimex/default/status/motor_temp');
  assert(tempTag !== undefined, 'Simulator wrote motor_temp tag');
  if (tempTag) {
    assert(typeof tempTag.value === 'number', 'Motor temp is numeric');
  }
}

async function cleanup() {
  console.log('\n── Cleanup ──');
  if (simulator) await simulator.stop();
  if (modbusServer) await modbusServer.stop();
  if (broker) await broker.stop();
}

async function main() {
  console.log('🧪 Integration Test: Embedded MQTT Broker + Modbus + Simulator\n');

  try {
    await testEmbeddedBroker();
    await testMqttPubSub();
    await testModbusTcpServer();
    await testSimulator();
    await testTagDatabaseIntegration();
  } catch (err: any) {
    console.error(`\n💥 Unexpected error: ${err.message}`);
    failed++;
  }

  await cleanup();

  console.log(`\n════════════════════════════════`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`════════════════════════════════\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
