import 'dotenv/config';
import jwt from 'jsonwebtoken';

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
