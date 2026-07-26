import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }, // thread root reply
    body: { type: String, required: true, trim: true, maxlength: 4000 },

    // 'inline' comments anchor to a text selection; 'general' comments do not.
    type: { type: String, enum: ['inline', 'general'], default: 'general' },
    anchor: {
      from: { type: Number, default: null },
      to: { type: Number, default: null },
      quote: { type: String, default: null },
    },

    resolved: { type: Boolean, default: false },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

commentSchema.index({ document: 1, createdAt: 1 });

export default mongoose.model('Comment', commentSchema);
