import asyncHandler from 'express-async-handler';
import Comment from '../models/Comment.js';
import { notify } from '../utils/notify.js';
import { broadcastToDoc } from '../sockets/index.js';

const audienceFor = (doc, excludeUserId) => {
  const ids = new Set([String(doc.owner), ...doc.collaborators.map((c) => String(c.user))]);
  ids.delete(String(excludeUserId));
  return [...ids];
};

// @route GET /api/documents/:id/comments
export const listComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ document: req.doc._id })
    .sort('createdAt')
    .populate('author', 'name penColor avatarUrl')
    .populate('resolvedBy', 'name');

  res.json({ success: true, comments });
});

// @route POST /api/documents/:id/comments
export const createComment = asyncHandler(async (req, res) => {
  const { body, type = 'general', anchor, parent } = req.body;

  if (!body || !body.trim()) {
    res.status(400);
    throw new Error('Comment body is required');
  }
  if (!['inline', 'general'].includes(type)) {
    res.status(400);
    throw new Error('Comment type must be "inline" or "general"');
  }
  if (type === 'inline' && (!anchor || anchor.from == null || anchor.to == null)) {
    res.status(400);
    throw new Error('Inline comments require an anchor selection');
  }

  const comment = await Comment.create({
    document: req.doc._id,
    author: req.user._id,
    parent: parent || null,
    body: body.trim(),
    type,
    anchor: type === 'inline' ? anchor : undefined,
  });

  await comment.populate('author', 'name penColor avatarUrl');

  const recipients = audienceFor(req.doc, req.user._id);
  await Promise.all(
    recipients.map((recipient) =>
      notify({
        recipient,
        actor: req.user._id,
        type: parent ? 'reply' : 'comment',
        document: req.doc._id,
        comment: comment._id,
        message: `${req.user.name} ${parent ? 'replied' : 'commented'} on "${req.doc.title}"`,
      })
    )
  );

  broadcastToDoc(String(req.doc._id), { type: 'comment:new', payload: { comment } });

  res.status(201).json({ success: true, comment });
});

// @route PATCH /api/documents/:id/comments/:commentId/resolve
export const toggleResolve = asyncHandler(async (req, res) => {
  const comment = await Comment.findOne({ _id: req.params.commentId, document: req.doc._id });
  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }

  comment.resolved = !comment.resolved;
  comment.resolvedBy = comment.resolved ? req.user._id : null;
  comment.resolvedAt = comment.resolved ? new Date() : null;
  await comment.save();

  broadcastToDoc(String(req.doc._id), { type: 'comment:resolved', payload: { comment } });

  res.json({ success: true, comment });
});

// @route DELETE /api/documents/:id/comments/:commentId
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findOne({ _id: req.params.commentId, document: req.doc._id });
  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }
  if (String(comment.author) !== String(req.user._id) && req.permission !== 'owner') {
    res.status(403);
    throw new Error('You can only delete your own comments');
  }

  await Comment.deleteMany({ $or: [{ _id: comment._id }, { parent: comment._id }] });

  broadcastToDoc(String(req.doc._id), {
    type: 'comment:deleted',
    payload: { commentId: String(comment._id) },
  });

  res.json({ success: true, message: 'Comment deleted' });
});
