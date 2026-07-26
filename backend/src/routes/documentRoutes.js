import { Router } from 'express';
import { protect, optionalAuth } from '../middleware/auth.js';
import { loadDocument } from '../middleware/documentAccess.js';
import {
  createDocument,
  listDocuments,
  getDocument,
  updateDocument,
  toggleStar,
  deleteDocument,
  getDocumentByShareToken,
  verifyShareTokenPassword,
} from '../controllers/documentController.js';
import {
  shareByEmail,
  acceptInvite,
  declineInvite,
  updateCollaboratorPermission,
  revokeCollaborator,
  updateLinkAccess,
  joinDocumentByToken,
} from '../controllers/shareController.js';
import {
  listComments,
  createComment,
  toggleResolve,
  deleteComment,
} from '../controllers/commentController.js';

const router = Router();

// Public share-link preview (no auth required to see basic info)
router.get('/shared/:token', optionalAuth, getDocumentByShareToken);
router.post('/shared/:token/verify', optionalAuth, verifyShareTokenPassword);

router.use(protect);

router.post('/join', joinDocumentByToken);
router.route('/').get(listDocuments).post(createDocument);

router.post('/:id/accept-invite', acceptInvite);
router.post('/:id/decline-invite', declineInvite);

router
  .route('/:id')
  .get(loadDocument('view'), getDocument)
  .patch(loadDocument('edit'), updateDocument)
  .delete(loadDocument('owner'), deleteDocument);

router.patch('/:id/star', loadDocument('view'), toggleStar);

router.post('/:id/share', loadDocument('owner'), shareByEmail);
router.patch('/:id/share/:userId', loadDocument('owner'), updateCollaboratorPermission);
router.delete('/:id/share/:userId', loadDocument('owner'), revokeCollaborator);
router.patch('/:id/link', loadDocument('owner'), updateLinkAccess);

router
  .route('/:id/comments')
  .get(loadDocument('view'), listComments)
  .post(loadDocument('view'), createComment);
router.patch('/:id/comments/:commentId/resolve', loadDocument('view'), toggleResolve);
router.delete('/:id/comments/:commentId', loadDocument('view'), deleteComment);

export default router;
