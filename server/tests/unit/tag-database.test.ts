import { TagDatabase } from '../../src/tags/tag-database';

describe('TagDatabase', () => {
  let db: TagDatabase;

  beforeEach(() => {
    db = new TagDatabase();
  });

  afterEach(() => {
    db.clear();
  });

  test('registers and reads a tag', () => {
    db.registerTag('test/speed', {
      address: 'test/speed',
      dataType: 'FLOAT32',
      accessMode: 'READ_WRITE',
      scaleFactor: 1.0,
      offset: 0,
    });

    db.writeTag('test/speed', 50, 'test');
    const value = db.readTag('test/speed');
    expect(value?.value).toBe(50);
    expect(value?.quality).toBe('good');
    expect(value?.source).toBe('test');
  });

  test('emits events on tag change', () => {
    const changes: any[] = [];
    db.registerTag('test/temp', {
      address: 'test/temp',
      dataType: 'FLOAT32',
      accessMode: 'READ_WRITE',
      scaleFactor: 1.0,
      offset: 0,
    });

    db.on('tag:changed', (addr, val) => changes.push({ addr, val }));
    db.writeTag('test/temp', 72.5, 'sensor');

    expect(changes).toHaveLength(1);
    expect(changes[0].addr).toBe('test/temp');
    expect(changes[0].val.value).toBe(72.5);
  });

  test('applies scale factor', () => {
    db.registerTag('test/scaled', {
      address: 'test/scaled',
      dataType: 'FLOAT32',
      accessMode: 'READ_WRITE',
      scaleFactor: 2.0,
      offset: 10,
    });

    db.writeTag('test/scaled', 5, 'test');
    expect(db.readTagValue('test/scaled')).toBe(20); // 5 * 2.0 + 10
  });

  test('prevents write to read-only tag', () => {
    db.registerTag('test/readonly', {
      address: 'test/readonly',
      dataType: 'FLOAT32',
      accessMode: 'READ',
      scaleFactor: 1.0,
      offset: 0,
    });

    db.writeTag('test/readonly', 100, 'test');
    expect(db.readTagValue('test/readonly')).toBeNull();
  });

  test('lists all tag addresses', () => {
    db.registerTag('a', { address: 'a', dataType: 'INT16', accessMode: 'READ_WRITE', scaleFactor: 1, offset: 0 });
    db.registerTag('b', { address: 'b', dataType: 'INT16', accessMode: 'READ_WRITE', scaleFactor: 1, offset: 0 });

    const addresses = db.getTagAddresses();
    expect(addresses).toContain('a');
    expect(addresses).toContain('b');
  });
});
