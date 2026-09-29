import { randomBytes } from 'node:crypto';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const publicCodeLength = 8;

export function createPublicCode() {
  const bytes = randomBytes(publicCodeLength);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
