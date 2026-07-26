import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import validator from 'validator';
import User from '../models/User.js';
import Document from '../models/Document.js';
import { notify } from '../utils/notify.js';
import { broadcastToDoc } from '../sockets/index.js';

// @route POST /api/documents/:id/share   { email, permission }  (owner only)
export const shareByEmail = asyncHandler(async (req, res) => {
  const { email, permission = 'edit' } = req.body;

  if (!email || !validator.isEmail(email)) {
    res.status(400);
    throw new Error('A valid email is required');
  }
  if (!['view', 'edit'].includes(permission)) {
    res.status(400);
    throw new Error('Permission must be "view" or "edit"');
  }

  const target = await User.findOne({ email: email.toLowerCase() });
  if (!target) {
    res.status(404);
    throw new Error('No CollabNoteAI user found with that email');
  }
  if (String(target._id) === String(req.doc.owner)) {
    res.status(400);
    throw new Error('You already own this document');
  }

  const existing = req.doc.collaborators.find((c) => String(c.user) === String(target._id));
  if (!existing) {
    // 5 users max per document (owner + 4 collaborators)
    if (req.doc.collaborators.length >= 4) {
      res.status(400);
      throw new Error('Maximum limit of 5 users per document reached');
    }
    req.doc.collaborators.push({
      user: target._id,
      permission,
      status: 'pending',
      invitedBy: req.user._id,
    });
  } else {
    existing.permission = permission;
  }

  await req.doc.save();
  await req.doc.populate('collaborators.user', 'name penColor avatarUrl email');

  broadcastToDoc(String(req.doc._id), {
    type: 'doc:collaborators_updated',
    payload: { collaborators: req.doc.collaborators },
  });

  await notify({
    recipient: target._id,
    actor: req.user._id,
    type: 'share',
    document: req.doc._id,
    message: `${req.user.name} invited you to collaborate on "${req.doc.title}"`,
  });

  res.json({
    success: true,
    message: `Invitation sent to ${target.email}`,
    collaborators: req.doc.collaborators,
  });
});

// @route POST /api/documents/:id/accept-invite
export const acceptInvite = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc || doc.isDeleted) {
    res.status(404);
    throw new Error('Document not found');
  }

  const collab = doc.collaborators.find((c) => String(c.user) === String(req.user._id));
  if (!collab) {
    res.status(404);
    throw new Error('No pending invitation found for this document');
  }

  collab.status = 'accepted';
  await doc.save();
  await doc.populate('collaborators.user', 'name penColor avatarUrl email');

  broadcastToDoc(String(doc._id), {
    type: 'doc:collaborators_updated',
    payload: { collaborators: doc.collaborators },
  });

  await notify({
    recipient: doc.owner,
    actor: req.user._id,
    type: 'share',
    document: doc._id,
    message: `${req.user.name} accepted your invitation to "${doc.title}"`,
  });

  res.json({ success: true, message: 'Invitation accepted' });
});

// @route POST /api/documents/:id/decline-invite
export const declineInvite = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc || doc.isDeleted) {
    res.status(404);
    throw new Error('Document not found');
  }

  doc.collaborators = doc.collaborators.filter((c) => String(c.user) !== String(req.user._id));
  await doc.save();
  await doc.populate('collaborators.user', 'name penColor avatarUrl email');

  broadcastToDoc(String(doc._id), {
    type: 'doc:collaborators_updated',
    payload: { collaborators: doc.collaborators },
  });

  res.json({ success: true, message: 'Invitation declined' });
});

// @route PATCH /api/documents/:id/share/:userId   { permission }  (owner only)
export const updateCollaboratorPermission = asyncHandler(async (req, res) => {
  const { permission } = req.body;
  if (!['view', 'edit'].includes(permission)) {
    res.status(400);
    throw new Error('Permission must be "view" or "edit"');
  }

  const collab = req.doc.collaborators.find((c) => String(c.user) === req.params.userId);
  if (!collab) {
    res.status(404);
    throw new Error('Collaborator not found on this document');
  }
  collab.permission = permission;
  await req.doc.save();
  await req.doc.populate('collaborators.user', 'name penColor avatarUrl email');

  broadcastToDoc(String(req.doc._id), {
    type: 'doc:collaborators_updated',
    payload: { collaborators: req.doc.collaborators },
  });

  await notify({
    recipient: collab.user,
    actor: req.user._id,
    type: 'permission_change',
    document: req.doc._id,
    message: `Your access to "${req.doc.title}" changed to ${permission}`,
  });

  res.json({ success: true, message: 'Permission updated', collaborators: req.doc.collaborators });
});

// @route DELETE /api/documents/:id/share/:userId  (owner only) - revoke access
export const revokeCollaborator = asyncHandler(async (req, res) => {
  req.doc.collaborators = req.doc.collaborators.filter(
    (c) => String(c.user) !== req.params.userId
  );
  await req.doc.save();
  await req.doc.populate('collaborators.user', 'name penColor avatarUrl email');

  broadcastToDoc(String(req.doc._id), {
    type: 'doc:collaborators_updated',
    payload: { collaborators: req.doc.collaborators },
  });

  res.json({ success: true, message: 'Access revoked', collaborators: req.doc.collaborators });
});

// @route PATCH /api/documents/:id/link   { linkAccess: 'restricted'|'view'|'edit', sharePassword } (owner only)
export const updateLinkAccess = asyncHandler(async (req, res) => {
  const { linkAccess, sharePassword } = req.body;
  if (!['restricted', 'view', 'edit'].includes(linkAccess)) {
    res.status(400);
    throw new Error('Invalid link access value');
  }
  req.doc.linkAccess = linkAccess;
  if (sharePassword !== undefined) {
    req.doc.sharePassword = sharePassword ? String(sharePassword).trim() : null;
  }
  await req.doc.save();

  res.json({
    success: true,
    linkAccess: req.doc.linkAccess,
    hasPassword: !!req.doc.sharePassword,
    shareUrl: `/shared/${req.doc.shareToken}`,
  });
});

// @route POST /api/documents/join   { linkOrToken, password }
export const joinDocumentByToken = asyncHandler(async (req, res) => {
  const { linkOrToken, password } = req.body;
  if (!linkOrToken || !String(linkOrToken).trim()) {
    res.status(400);
    throw new Error('Share link or token is required');
  }

  // Extract raw token from full URL or path if needed
  let token = String(linkOrToken).trim();
  if (token.includes('/shared/')) {
    token = token.split('/shared/')[1].split('?')[0].split('#')[0].trim();
  } else if (token.includes('/')) {
    token = token.split('/').pop().trim();
  }

  const isObjId = mongoose.Types.ObjectId.isValid(token);
  const query = isObjId
    ? { $or: [{ shareToken: token }, { _id: token }], isDeleted: false }
    : { shareToken: token, isDeleted: false };

  const doc = await Document.findOne(query);
  if (!doc) {
    res.status(404);
    throw new Error('This link is invalid or no longer shared');
  }

  const userId = req.user._id;
  const isOwner = String(doc.owner) === String(userId);
  const existingCollab = doc.collaborators.find((c) => String(c.user) === String(userId));

  if (doc.linkAccess === 'restricted' && !isOwner && !existingCollab) {
    res.status(404);
    throw new Error('This link is invalid or no longer shared');
  }

  if (!isOwner && !existingCollab && doc.sharePassword) {
    if (!password || !(await doc.compareSharePassword(password.trim()))) {
      res.status(401);
      throw new Error('Incorrect password for this document link');
    }
  }

  if (!isOwner && !existingCollab) {
    if (doc.collaborators.length >= 4) {
      res.status(400);
      throw new Error('Maximum limit of 5 users per document reached');
    }

    doc.collaborators.push({
      user: userId,
      permission: doc.linkAccess === 'edit' ? 'edit' : 'view',
      status: 'accepted',
      invitedBy: doc.owner,
    });

    await doc.save();
    await doc.populate('collaborators.user', 'name penColor avatarUrl email');

    broadcastToDoc(String(doc._id), {
      type: 'doc:collaborators_updated',
      payload: { collaborators: doc.collaborators },
    });

    await notify({
      recipient: doc.owner,
      actor: userId,
      type: 'share',
      document: doc._id,
      message: `${req.user.name} joined "${doc.title}" via share link`,
    });
  } else if (existingCollab && existingCollab.status === 'pending') {
    existingCollab.status = 'accepted';
    await doc.save();
  }

  res.json({
    success: true,
    documentId: doc._id,
    title: doc.title,
    message: 'Joined document successfully',
  });
});

