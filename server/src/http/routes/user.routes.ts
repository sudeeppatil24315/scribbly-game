import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Public routes
router.get('/:username', UserController.getProfile);

// Protected routes
router.patch('/me', authenticate, UserController.updateProfile);
router.get('/me/stats', authenticate, UserController.getStats);
router.get('/me/cosmetics', authenticate, UserController.getCosmetics);
router.patch('/me/cosmetics/:id/equip', authenticate, UserController.equipCosmetic);

// Privacy and GDPR routes
router.post('/me/delete', authenticate, UserController.requestAccountDeletion);
router.delete('/me', authenticate, UserController.deleteAccount);
router.get('/me/export', authenticate, UserController.exportData);

export default router;
