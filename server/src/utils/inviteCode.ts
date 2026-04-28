import crypto from 'crypto';

export function generateInviteCode(length = 8): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length).toUpperCase();
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
