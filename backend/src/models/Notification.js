import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['share', 'comment', 'reply', 'mention', 'permission_change', 'document_deleted'],
      required: true,
    },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
