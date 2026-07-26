import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const collaboratorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    permission: { type: String, enum: ['view', 'edit'], default: 'edit' },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false, timestamps: { createdAt: 'sharedAt', updatedAt: false } }
);

const strokeSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => nanoid(8) },
    color: { type: String, default: '#1f2937' },
    width: { type: Number, default: 3 },
    points: { type: mongoose.Schema.Types.Mixed, default: [] }, // array of {x,y}
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false, timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, default: 'Untitled document', trim: true, maxlength: 200 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Tiptap/ProseMirror JSON content — the single source of truth for text.
    content: { type: mongoose.Schema.Types.Mixed, default: { type: 'doc', content: [] } },
    // Monotonic version counter used to order/merge realtime edits.
    version: { type: Number, default: 0 },

    strokes: { type: [strokeSchema], default: [] },

    collaborators: { type: [collaboratorSchema], default: [] },

    // Public share link
    shareToken: { type: String, default: () => nanoid(12), unique: true },
    linkAccess: { type: String, enum: ['restricted', 'view', 'edit'], default: 'restricted' },
    sharePassword: { type: String, default: null },

    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isDeleted: { type: Boolean, default: false },

    lastEditedAt: { type: Date, default: Date.now },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

documentSchema.index({ title: 'text' });

// Share-link passwords were previously stored and compared in plain text —
// hash them the same way User passwords are hashed, so a database leak
// doesn't also leak every document's link password verbatim.
documentSchema.pre('save', async function hashSharePassword(next) {
  if (!this.isModified('sharePassword') || !this.sharePassword) return next();
  // Already a bcrypt hash (e.g. re-saving an already-hashed value) — skip.
  if (/^\$2[aby]\$/.test(this.sharePassword)) return next();
  this.sharePassword = await bcrypt.hash(this.sharePassword, 10);
  next();
});

documentSchema.methods.compareSharePassword = function compareSharePassword(candidate) {
  if (!this.sharePassword || !candidate) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.sharePassword);
};

documentSchema.methods.permissionFor = function permissionFor(userId) {
  if (!userId) return null;
  const uid = String(userId);
  if (String(this.owner?._id || this.owner) === uid) return 'owner';
  const collab = this.collaborators.find((c) => String(c.user?._id || c.user) === uid);
  if (collab && collab.status === 'accepted') return collab.permission;
  return null;
};

documentSchema.methods.toSummaryJSON = function toSummaryJSON(userId) {
  return {
    id: this._id,
    title: this.title,
    owner: this.owner,
    version: this.version,
    collaboratorCount: this.collaborators.filter(c => c.status === 'accepted').length,
    starred: userId ? this.starredBy.some((u) => String(u) === String(userId)) : false,
    permission: this.permissionFor(userId),
    lastEditedAt: this.lastEditedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export default mongoose.model('Document', documentSchema);
