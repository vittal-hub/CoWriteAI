import asyncHandler from 'express-async-handler';
import Document from '../models/Document.js';

// Loads the document at req.params.id / req.params.docId into req.doc and
// ensures the requester has at least "view" access. Pass require='edit' to
// additionally require edit/owner access.
export const loadDocument = (require = 'view') =>
  asyncHandler(async (req, res, next) => {
    const id = req.params.id || req.params.docId;
    const doc = await Document.findById(id);

    if (!doc || doc.isDeleted) {
      res.status(404);
      throw new Error('Document not found');
    }

    const permission = doc.permissionFor(req.user?._id);

    const isPublicViewable = doc.linkAccess === 'view' || doc.linkAccess === 'edit';
    const effectivePermission =
      permission || (isPublicViewable ? doc.linkAccess : null);

    if (!effectivePermission) {
      res.status(403);
      throw new Error('You do not have access to this document');
    }

    if (require === 'edit' && !['owner', 'edit'].includes(effectivePermission)) {
      res.status(403);
      throw new Error('You only have view access to this document');
    }

    if (require === 'owner' && effectivePermission !== 'owner') {
      res.status(403);
      throw new Error('Only the document owner can do this');
    }

    req.doc = doc;
    req.permission = effectivePermission;
    next();
  });
