import path from 'path';
import { spawnSync } from 'child_process';

describe('logger file output resilience', () => {
  test('does not crash process when file stream emits ENOSPC', () => {
    const serverRoot = path.resolve(__dirname, '../..');
    const script = [
      "const { configureFileLogging, createLogger } = require('./src/utils/logger');",
      "configureFileLogging({ filePath: '/dev/full' });",
      "const log = createLogger('logger-test');",
      "log.info('before-error');",
      "setTimeout(() => {",
      "  log.info('after-error');",
      "  process.exit(0);",
      "}, 100);",
    ].join('\n');

    const result = spawnSync(
      process.execPath,
      ['-r', 'ts-node/register/transpile-only', '-e', script],
      {
        cwd: serverRoot,
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain('Unhandled');
    expect(result.stderr).not.toContain('uncaught');
  });
});
