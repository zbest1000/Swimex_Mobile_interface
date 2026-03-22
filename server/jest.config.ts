import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/unit/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@mqtt/(.*)$': '<rootDir>/src/mqtt/$1',
    '^@modbus/(.*)$': '<rootDir>/src/modbus/$1',
    '^@http/(.*)$': '<rootDir>/src/http/$1',
    '^@communication/(.*)$': '<rootDir>/src/communication/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
    '^@graphics/(.*)$': '<rootDir>/src/graphics/$1',
    '^@workouts/(.*)$': '<rootDir>/src/workouts/$1',
    '^@admin/(.*)$': '<rootDir>/src/admin/$1',
    '^@tags/(.*)$': '<rootDir>/src/tags/$1',
    '^@websocket/(.*)$': '<rootDir>/src/websocket/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        rootDir: '.',
        outDir: './dist',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        module: 'commonjs',
        target: 'ES2022',
        lib: ['ES2022'],
        moduleResolution: 'node',
      },
    }],
    '^.+\\.js$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        allowJs: true,
        module: 'commonjs',
        target: 'ES2022',
        esModuleInterop: true,
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(aedes|mqemitter|mqtt-packet|readable-stream|hyperid)/)',
  ],
};

export default config;
