import { getDb } from '../database/connection';
import { createLogger } from '../utils/logger';
import { auditLog } from '../auth/audit';
import { ValidationError, NotFoundError } from '../utils/errors';

const log = createLogger('branding');

export interface BrandingConfig {
  businessName: string;
  businessTagline: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  address: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  splashMessage: string;
  footerText: string;
  customCss: string;
}

export interface LogoInfo {
  id: string;
  type: 'primary' | 'secondary' | 'favicon' | 'splash';
  mimeType: string;
  width: number | null;
  height: number | null;
  updatedAt: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
  businessName: 'SwimEx',
  businessTagline: 'Swim-in-Place Pool Control',
  contactEmail: '',
  contactPhone: '',
  website: '',
  address: '',
  primaryColor: '#0066cc',
  secondaryColor: '#004499',
  accentColor: '#00cc66',
  splashMessage: 'Welcome to SwimEx EDGE',
  footerText: '© SwimEx — Swim-in-Place Pool Control',
  customCss: '',
};

export function getBranding(): BrandingConfig {
  const db = getDb();
  const row = db.prepare("SELECT value FROM system_config WHERE key = 'branding'").get() as { value: string } | undefined;
  if (row) {
    try {
      return { ...DEFAULT_BRANDING, ...JSON.parse(row.value) };
    } catch {
      return { ...DEFAULT_BRANDING };
    }
  }
  return { ...DEFAULT_BRANDING };
}

export function updateBranding(updates: Partial<BrandingConfig>, actorId: string): BrandingConfig {
  if (updates.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(updates.primaryColor)) {
    throw new ValidationError('Primary color must be a valid hex color (e.g. #0066cc)');
  }
  if (updates.secondaryColor && !/^#[0-9a-fA-F]{6}$/.test(updates.secondaryColor)) {
    throw new ValidationError('Secondary color must be a valid hex color (e.g. #004499)');
  }
  if (updates.accentColor && !/^#[0-9a-fA-F]{6}$/.test(updates.accentColor)) {
    throw new ValidationError('Accent color must be a valid hex color (e.g. #00cc66)');
  }

  const current = getBranding();
  const updated = { ...current, ...updates };

  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('branding', ?, datetime('now'))
  `).run(JSON.stringify(updated));

  auditLog('BRANDING_UPDATED', actorId, 'system', 'branding', { updates: Object.keys(updates) });
  log.info('Branding configuration updated');

  return updated;
}

export function uploadLogo(
  type: 'primary' | 'secondary' | 'favicon' | 'splash',
  fileBuffer: Buffer,
  mimeType: string,
  actorId: string,
): LogoInfo {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/x-icon'];
  if (!allowedTypes.includes(mimeType)) {
    throw new ValidationError(`Invalid file type: ${mimeType}. Allowed: ${allowedTypes.join(', ')}`);
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (fileBuffer.length > maxSize) {
    throw new ValidationError('Logo file must be under 5MB');
  }

  const db = getDb();
  const key = `logo_${type}`;

  db.prepare(`
    INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
  `).run(key, fileBuffer.toString('base64'));

  db.prepare(`
    INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
  `).run(`${key}_mime`, mimeType);

  auditLog('LOGO_UPLOADED', actorId, 'system', key, { type, mimeType, size: fileBuffer.length });
  log.info(`Logo uploaded: ${type} (${mimeType}, ${fileBuffer.length} bytes)`);

  return {
    id: key,
    type,
    mimeType,
    width: null,
    height: null,
    updatedAt: new Date().toISOString(),
  };
}

export function getLogo(type: 'primary' | 'secondary' | 'favicon' | 'splash'): { data: Buffer; mimeType: string } {
  const db = getDb();
  const key = `logo_${type}`;

  const dataRow = db.prepare('SELECT value FROM system_config WHERE key = ?').get(key) as { value: string } | undefined;
  const mimeRow = db.prepare('SELECT value FROM system_config WHERE key = ?').get(`${key}_mime`) as { value: string } | undefined;

  if (!dataRow) {
    throw new NotFoundError(`Logo not found: ${type}`);
  }

  return {
    data: Buffer.from(dataRow.value, 'base64'),
    mimeType: mimeRow?.value ?? 'image/png',
  };
}

export function deleteLogo(type: 'primary' | 'secondary' | 'favicon' | 'splash', actorId: string): void {
  const db = getDb();
  const key = `logo_${type}`;

  db.prepare('DELETE FROM system_config WHERE key = ?').run(key);
  db.prepare('DELETE FROM system_config WHERE key = ?').run(`${key}_mime`);

  auditLog('LOGO_DELETED', actorId, 'system', key, { type });
  log.info(`Logo deleted: ${type}`);
}

export function listLogos(): LogoInfo[] {
  const db = getDb();
  const types: Array<'primary' | 'secondary' | 'favicon' | 'splash'> = ['primary', 'secondary', 'favicon', 'splash'];
  const logos: LogoInfo[] = [];

  for (const type of types) {
    const key = `logo_${type}`;
    const dataRow = db.prepare('SELECT value, updated_at FROM system_config WHERE key = ?').get(key) as { value: string; updated_at: string } | undefined;
    const mimeRow = db.prepare('SELECT value FROM system_config WHERE key = ?').get(`${key}_mime`) as { value: string } | undefined;

    if (dataRow) {
      logos.push({
        id: key,
        type,
        mimeType: mimeRow?.value ?? 'image/png',
        width: null,
        height: null,
        updatedAt: dataRow.updated_at,
      });
    }
  }

  return logos;
}
