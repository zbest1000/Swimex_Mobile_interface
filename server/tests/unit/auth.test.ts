import { initDatabase, closeDatabase } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import * as authService from '../../src/auth/auth-service';
import { UserRole, CommissioningOrg } from '../../src/shared/models';

describe('AuthService', () => {
  const testDataDir = '/tmp/edge-test-' + Date.now();

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
  });

  test('creates a user', async () => {
    const user = await authService.createUser('testuser', 'password123', 'Test User', UserRole.USER);
    expect(user.username).toBe('testuser');
    expect(user.role).toBe(UserRole.USER);
    expect(user.isActive).toBe(true);
  });

  test('logs in with correct credentials', async () => {
    const { user, token } = await authService.login('testuser', 'password123');
    expect(user.username).toBe('testuser');
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  test('rejects wrong password', async () => {
    await expect(authService.login('testuser', 'wrongpass')).rejects.toThrow('Invalid credentials');
  });

  test('verifies JWT token', async () => {
    const { token } = await authService.login('testuser', 'password123');
    const payload = authService.verifyToken(token);
    expect(payload.username).toBe('testuser');
    expect(payload.role).toBe(UserRole.USER);
  });

  test('sets and verifies commissioning code', async () => {
    await authService.setCommissioningCode(CommissioningOrg.SWIMEX, 'A3F7K2-9BQ4M1-R8D2W6-5HN3J7');
    await authService.setCommissioningCode(CommissioningOrg.BSC_INDUSTRIES, 'X1Y2Z3-A4B5C6-D7E8F9-G1H2J3');
    expect(authService.isCommissioned()).toBe(true);
  });

  test('resets super admin with valid code', async () => {
    const user = await authService.resetSuperAdmin(
      CommissioningOrg.SWIMEX,
      'A3F7K2-9BQ4M1-R8D2W6-5HN3J7',
      'newsuperadmin',
      'newpassword123',
    );
    expect(user.role).toBe(UserRole.SUPER_ADMINISTRATOR);
    expect(user.username).toBe('newsuperadmin');
  });

  test('rejects invalid commissioning code', async () => {
    await expect(
      authService.resetSuperAdmin(CommissioningOrg.SWIMEX, 'WRONG1-WRONG2-WRONG3-WRONG4', 'x', 'password123')
    ).rejects.toThrow('Invalid commissioning code');
  });
});
