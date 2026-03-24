import crypto from 'crypto';
import { config } from './config';

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(): Buffer {
  return crypto.scryptSync(config.jwtSecret, 'swimex-edge-config-export', KEY_LEN);
}

/**
 * Encrypt a plaintext string. Returns a base64 blob containing IV + ciphertext + auth tag.
 */
export function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString('base64');
}

/**
 * Decrypt a base64 blob produced by encrypt(). Returns the original plaintext.
 * Returns null if decryption fails (wrong key, tampered data, etc.).
 */
export function decrypt(blob: string): string | null {
  try {
    const buf = Buffer.from(blob, 'base64');
    if (buf.length < IV_LEN + TAG_LEN + 1) return null;
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(buf.length - TAG_LEN);
    const ciphertext = buf.subarray(IV_LEN, buf.length - TAG_LEN);
    const key = deriveKey();
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}
