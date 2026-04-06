import { PassThrough } from 'stream';

describe('logger file stream hardening', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.dontMock('fs');
  });

  test('handles file stream errors without throwing', async () => {
    const fakeStream = new PassThrough();
    const writeMock = jest.fn().mockReturnValue(true);
    (fakeStream as any).write = writeMock;

    const mockFs = {
      mkdirSync: jest.fn(),
      existsSync: jest.fn().mockReturnValue(false),
      statSync: jest.fn().mockReturnValue({ size: 0 }),
      createWriteStream: jest.fn().mockReturnValue(fakeStream),
    };

    jest.doMock('fs', () => ({
      __esModule: true,
      default: mockFs,
    }));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const loggerModule = await import('../../src/utils/logger');
    const { configureFileLogging, createLogger } = loggerModule;

    configureFileLogging({ filePath: '/tmp/edge-test.log' });
    const log = createLogger('logger-test');
    log.info('before stream failure');

    expect(fakeStream.listenerCount('error')).toBeGreaterThan(0);
    expect(() => fakeStream.emit('error', new Error('disk full'))).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[LOGGER] File logging disabled'));

    const writesBefore = writeMock.mock.calls.length;
    log.info('after stream failure');
    expect(writeMock.mock.calls.length).toBe(writesBefore);
  });
});
