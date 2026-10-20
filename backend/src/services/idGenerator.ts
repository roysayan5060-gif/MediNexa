import crypto from 'crypto';

export type IdPrefix = 'PAT' | 'DOC' | 'APT' | 'RX' | 'ENC' | 'INV' | 'REM' | 'CLN' | 'SET' | 'LEDG';

/**
 * Generates structured, readable, unique server-side domain identifiers.
 * e.g., PAT-2026-A1B2, APT-2026-C3D4, RX-2026-E5F6, SET-2026-F123, LEDG-2026-A987
 */
export const generateId = (prefix: IdPrefix): string => {
  const currentYear = new Date().getFullYear();
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  const timestampPart = Date.now().toString().slice(-4);
  return `${prefix}-${currentYear}-${randomHex}${timestampPart}`;
};
