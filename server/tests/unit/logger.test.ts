import { EventEmitter } from 'events';
import fs from 'fs';
import { closeLogger, configureFileLogging, createLogger } from '../../src/utils/logger';

class FakeWriteStream extends EventEmitter {
  write = jest.fn();
  end = jest.fn();
  destroy = jest.fn();
}

describe('logger file stream errors', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    closeLogger();
    jest.restoreAllMocks();
  });

  test('disables file logging when stream emits error', () => {
    const fakeStream = new FakeWriteStream();
    jest.spyOn(fs, 'createWriteStream').mockReturnValue(fakeStream as unknown as fs.WriteStream);

    configureFileLogging({ filePath: '/tmp/logger-error-test.log' });
    const log = createLogger('logger-test');

    expect(fakeStream.listenerCount('error')).toBeGreaterThan(0);
    expect(() => fakeStream.emit('error', new Error('ENOSPC: no space left on device'))).not.toThrow();
    expect(fakeStream.destroy).toHaveBeenCalledTimes(1);

    log.info('write after stream failure');
    expect(fakeStream.write).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('File logging disabled after stream error'),
    );
  });
});
