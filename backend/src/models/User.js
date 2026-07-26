import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const PEN_COLORS = ['indigo', 'coral', 'teal', 'amber', 'violet', 'rose', 'sky', 'lime'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    penColor: {
      type: String,
      enum: PEN_COLORS,
      default: () => PEN_COLORS[Math.floor(Math.random() * PEN_COLORS.length)],
    },
    avatarUrl: { type: String, default: null },

    // ── Email verification ──────────────────────────────────────────────
    // Login is blocked until this is true (see authController.login).
    isVerified: { type: Boolean, default: false },
    // Only a SHA-256 hash of the token is stored — mirrors how passwords are
    // never stored raw — so a database leak alone can't be used to verify
    // (or otherwise take over) an account via a leaked token.
    verificationTokenHash: { type: String, default: null, select: false },
    verificationTokenExpires: { type: Date, default: null, select: false },

    // ── Brute-force lockout ──────────────────────────────────────────────
    // Extra layer beyond the per-IP rate limiter on /auth/login — this one
    // protects a single targeted account even if attempts are spread across
    // many IPs.
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function isLocked() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    penColor: this.penColor,
    avatarUrl: this.avatarUrl,
    isVerified: this.isVerified,
    initials: this.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join(''),
  };
};

export const PEN_COLOR_LIST = PEN_COLORS;
export default mongoose.model('User', userSchema);
