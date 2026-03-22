import { getDb } from '../database/connection';
import { createLogger } from '../utils/logger';
import { availablePacks } from './i18n-packs';

const log = createLogger('i18n');

export interface LanguageInfo {
  locale: string;
  displayName: string;
  nativeName: string;
  isBuiltIn: boolean;
}

export function listLanguages(): LanguageInfo[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT locale, display_name, native_name, is_built_in FROM language_packs WHERE is_installed = 1 ORDER BY locale'
  ).all() as Array<{ locale: string; display_name: string; native_name: string; is_built_in: number }>;
  return rows.map(r => ({
    locale: r.locale,
    displayName: r.display_name,
    nativeName: r.native_name,
    isBuiltIn: Boolean(r.is_built_in),
  }));
}

export function getTranslations(locale: string): Record<string, string> | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT translations FROM language_packs WHERE locale = ? AND is_installed = 1'
  ).get(locale) as { translations: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.translations);
  } catch {
    return null;
  }
}

export function installLanguagePack(locale: string): LanguageInfo {
  const db = getDb();
  const existing = db.prepare('SELECT locale FROM language_packs WHERE locale = ?').get(locale) as { locale: string } | undefined;
  if (existing) {
    db.prepare("UPDATE language_packs SET is_installed = 1, updated_at = datetime('now') WHERE locale = ?").run(locale);
    const row = db.prepare('SELECT locale, display_name, native_name, is_built_in FROM language_packs WHERE locale = ?').get(locale) as {
      locale: string; display_name: string; native_name: string; is_built_in: number;
    };
    log.info(`Re-installed language pack: ${locale}`);
    return { locale: row.locale, displayName: row.display_name, nativeName: row.native_name, isBuiltIn: Boolean(row.is_built_in) };
  }

  const pack = availablePacks.find(p => p.locale === locale);
  if (!pack) {
    throw new Error(`Language pack '${locale}' is not available for download`);
  }

  db.prepare(`
    INSERT INTO language_packs (locale, display_name, native_name, is_built_in, is_installed, translations)
    VALUES (?, ?, ?, 0, 1, ?)
  `).run(pack.locale, pack.displayName, pack.nativeName, JSON.stringify(pack.translations));

  log.info(`Installed language pack: ${locale} (${pack.displayName})`);
  return {
    locale: pack.locale,
    displayName: pack.displayName,
    nativeName: pack.nativeName,
    isBuiltIn: false,
  };
}

export function removeLanguagePack(locale: string): void {
  if (locale === 'en') {
    throw new Error('Cannot remove the built-in English language pack');
  }
  const db = getDb();
  const row = db.prepare('SELECT locale, is_built_in FROM language_packs WHERE locale = ?').get(locale) as { locale: string; is_built_in: number } | undefined;
  if (!row) {
    throw new Error(`Language pack '${locale}' not found`);
  }
  if (row.is_built_in) {
    throw new Error('Cannot remove a built-in language pack');
  }
  db.prepare("UPDATE language_packs SET is_installed = 0, updated_at = datetime('now') WHERE locale = ?").run(locale);
  log.info(`Removed language pack: ${locale}`);
}

export function getAvailablePacks(): Array<{ locale: string; displayName: string; nativeName: string; installed: boolean }> {
  const db = getDb();
  const installed = db.prepare('SELECT locale FROM language_packs WHERE is_installed = 1').all() as Array<{ locale: string }>;
  const installedSet = new Set(installed.map(r => r.locale));

  return availablePacks.map(p => ({
    locale: p.locale,
    displayName: p.displayName,
    nativeName: p.nativeName,
    installed: installedSet.has(p.locale),
  }));
}

export function getDefaultLocale(): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM system_config WHERE key = 'default_locale'").get() as { value: string } | undefined;
  return row?.value || 'en';
}

export function setDefaultLocale(locale: string): void {
  const db = getDb();
  const pack = db.prepare('SELECT locale FROM language_packs WHERE locale = ? AND is_installed = 1').get(locale);
  if (!pack) {
    throw new Error(`Language pack '${locale}' is not installed`);
  }
  db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('default_locale', ?, datetime('now'))").run(locale);
  log.info(`Default locale set to: ${locale}`);
}

export function isAutoLocaleEnabled(): boolean {
  const db = getDb();
  const row = db.prepare("SELECT value FROM system_config WHERE key = 'auto_locale_detection'").get() as { value: string } | undefined;
  return row?.value === 'true';
}

export function setAutoLocaleDetection(enabled: boolean): void {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('auto_locale_detection', ?, datetime('now'))").run(enabled ? 'true' : 'false');
  log.info(`Auto locale detection set to: ${enabled}`);
}
