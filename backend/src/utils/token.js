import 'dotenv/config';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// No hardcoded fallback — an unset JWT_SECRET must fail loudly, not let
// anyone forge valid tokens with a known checked-in default.
const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set — refusing to sign/verify tokens. Check backend/.env.');
  }
  return secret;
};

export const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export const verifyToken = (token) => jwt.verify(token, getSecret());

// One-time tokens (email verification) — only the hash is ever persisted, never the raw token.
export const hashOneTimeToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

export const generateOneTimeToken = (ttlMs) => {
  const raw = crypto.randomBytes(32).toString('hex');
  return {
    raw,
    hash: hashOneTimeToken(raw),
    expiresAt: new Date(Date.now() + ttlMs),
  };
};
