import 'dotenv/config';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// No hardcoded fallback: a checked-in default secret would let anyone forge
// valid auth tokens for any user if JWT_SECRET is ever unset in an
// environment (e.g. a misconfigured deploy) — fail loudly instead, matching
// the same fail-fast approach used for MONGO_URI in config/db.js.
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

// ── One-time tokens (email verification) ────────────────────────────────
// The raw token is what goes out in the emailed link; only its SHA-256 hash
// is ever persisted, the same way passwords are never stored raw — a
// database leak alone then can't be used to verify (or take over) accounts.
export const hashOneTimeToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

export const generateOneTimeToken = (ttlMs) => {
  const raw = crypto.randomBytes(32).toString('hex');
  return {
    raw,
    hash: hashOneTimeToken(raw),
    expiresAt: new Date(Date.now() + ttlMs),
  };
};
