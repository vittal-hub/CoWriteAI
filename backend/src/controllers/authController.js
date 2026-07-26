import asyncHandler from 'express-async-handler';
import validator from 'validator';
import mongoose from 'mongoose';
import User, { PEN_COLOR_LIST } from '../models/User.js';
import Document from '../models/Document.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import { signToken, generateOneTimeToken, hashOneTimeToken } from '../utils/token.js';
import { sendVerificationEmail } from '../utils/mailer.js';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15min

// Derived from the actual request (not NODE_ENV) since a Secure cookie is
// silently dropped over plain HTTP; `req.secure` respects X-Forwarded-Proto
// via `trust proxy` in app.js, so this works both locally and behind TLS.
const cookieOptions = (req) => {
  const secure = Boolean(req?.secure);
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax', // SameSite=None requires Secure
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

const sendAuthResponse = (req, res, user, statusCode = 200) => {
  const token = signToken(user._id);
  res
    .status(statusCode)
    .cookie('token', token, cookieOptions(req))
    .json({ success: true, token, user: user.toPublicJSON() });
};

// Mirrors (and enforces server-side) the strength meter shown in Signup.jsx.
function passwordPolicyError(password) {
  if (password.length < 8) return 'Password must be at least 8 characters';
  let variety = 0;
  if (/[A-Z]/.test(password)) variety++;
  if (/[0-9]/.test(password)) variety++;
  if (/[^A-Za-z0-9]/.test(password)) variety++;
  if (variety < 2) {
    return 'Password must include at least 2 of: an uppercase letter, a number, a special character';
  }
  return null;
}

// @route POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, penColor } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }
  if (!validator.isEmail(email)) {
    res.status(400);
    throw new Error('Please provide a valid email');
  }
  const passwordError = passwordPolicyError(password);
  if (passwordError) {
    res.status(400);
    throw new Error(passwordError);
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409);
    throw new Error('An account with this email already exists');
  }

  const { raw, hash, expiresAt } = generateOneTimeToken(VERIFICATION_TOKEN_TTL_MS);

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    password,
    // Signup's pen-color picker is optional — an invalid/missing value falls
    // back to the schema's random default rather than rejecting the request.
    ...(PEN_COLOR_LIST.includes(penColor) ? { penColor } : {}),
    isVerified: false,
    verificationTokenHash: hash,
    verificationTokenExpires: expiresAt,
  });

  await sendVerificationEmail(user, raw);

  // No cookie/session issued here — login blocks unverified accounts anyway.
  res.status(201).json({
    success: true,
    message: 'Account created. Check your email to verify your account before signing in.',
  });
});

// @route GET /api/auth/verify-email/:token
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  if (!token) {
    res.status(400);
    throw new Error('Verification token is required');
  }

  const hash = hashOneTimeToken(token);
  const user = await User.findOne({ verificationTokenHash: hash }).select(
    '+verificationTokenHash +verificationTokenExpires'
  );

  if (!user || !user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
    res.status(400);
    throw new Error('This verification link is invalid or has expired. Request a new one.');
  }

  user.isVerified = true;
  user.verificationTokenHash = null;
  user.verificationTokenExpires = null;
  await user.save();

  // Log them in immediately — no need for a redundant /login step right
  // after they've just proven ownership of the mailbox.
  sendAuthResponse(req, res, user);
});

// @route POST /api/auth/resend-verification   { email }
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || !validator.isEmail(email)) {
    res.status(400);
    throw new Error('A valid email is required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Same response whether or not the account exists — avoids leaking which
  // emails are registered via this logged-out-accessible endpoint.
  const genericResponse = {
    success: true,
    message: 'If an account with that email exists and is not yet verified, a new verification link has been sent.',
  };

  if (!user || user.isVerified) {
    return res.json(genericResponse);
  }

  const { raw, hash, expiresAt } = generateOneTimeToken(VERIFICATION_TOKEN_TTL_MS);
  user.verificationTokenHash = hash;
  user.verificationTokenExpires = expiresAt;
  await user.save();
  await sendVerificationEmail(user, raw);

  res.json(genericResponse);
});

// @route POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password +failedLoginAttempts +lockUntil'
  );

  // Unlike the generic "invalid email or password" below, a lockout is
  // reported honestly with a wait time — a vague error here would just
  // prompt more retries against it.
  if (user?.isLocked()) {
    res.status(423);
    throw new Error(
      `Too many failed attempts. Try again in ${Math.ceil((user.lockUntil - Date.now()) / 60000)} minute(s).`
    );
  }

  const validPassword = user && (await user.comparePassword(password));

  if (!validPassword) {
    if (user) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        user.failedLoginAttempts = 0;
      }
      await user.save();
    }
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (user.failedLoginAttempts > 0 || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  }

  if (!user.isVerified) {
    res.status(403);
    throw new Error('Please verify your email before signing in. Check your inbox for the verification link.');
  }

  sendAuthResponse(req, res, user);
});

// @route POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', cookieOptions(req));
  res.json({ success: true, message: 'Logged out' });
});

// @route GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
});

// @route PATCH /api/auth/me
export const updateMe = asyncHandler(async (req, res) => {
  const { name, avatarUrl } = req.body;
  if (name) req.user.name = name.trim();
  if (avatarUrl !== undefined) req.user.avatarUrl = avatarUrl;
  await req.user.save();
  res.json({ success: true, user: req.user.toPublicJSON() });
});

// @route DELETE /api/auth/me
// Deletes the authenticated user account + cascades cleanup of owned documents,
// authored comments, and references in collaborators/starredBy/other docs.
export const deleteMe = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);

  // 1. IDs of all documents owned by this user
  const ownedDocIds = (
    await Document.find({ owner: userId }, { _id: 1 }).lean()
  ).map((d) => d._id);

  // 2. Delete comments authored by the user (on any document — owned or shared)
  await Comment.deleteMany({ author: userId });

  // 3. Delete comments on documents this user owns (documents themselves will be deleted,
  //    but we clean up explicitly to avoid orphan comments in the collection)
  if (ownedDocIds.length > 0) {
    await Comment.deleteMany({ document: { $in: ownedDocIds } });
  }

  // 4. Delete notifications where user is recipient OR actor
  await Notification.deleteMany({
    $or: [{ recipient: userId }, { actor: userId }],
  });

  // 5. Delete all documents owned by the user (comments on them already deleted above)
  if (ownedDocIds.length > 0) {
    await Document.deleteMany({ _id: { $in: ownedDocIds } });
  }

  // 6. Clean up user references in remaining documents (shared docs they were in):
  //    - Remove from collaborators arrays
  //    - Remove from starredBy arrays
  //    - Unset lastEditedBy if it pointed to the deleted user
  await Document.updateMany(
    { $or: [{ 'collaborators.user': userId }, { starredBy: userId }, { lastEditedBy: userId }] },
    [
      {
        $set: {
          collaborators: {
            $filter: {
              input: '$collaborators',
              as: 'c',
              cond: { $ne: ['$$c.user', userId] },
            },
          },
          starredBy: {
            $filter: {
              input: '$starredBy',
              as: 's',
              cond: { $ne: ['$$s', userId] },
            },
          },
        },
      },
      {
        $set: {
          lastEditedBy: {
            $cond: [{ $eq: ['$lastEditedBy', userId] }, null, '$lastEditedBy'],
          },
        },
      },
    ],
  );

  // 7. Finally delete the user document itself — so they can no longer login with the same creds
  await User.deleteOne({ _id: userId });

  // 8. Invalidate the session cookie so the caller is logged out immediately
  res.clearCookie('token', cookieOptions(req));
  res.json({ success: true, message: 'Account deleted' });
});
