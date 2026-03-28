import { Router } from 'express';
import { WordPackController } from '../controllers/wordpack.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';

const router = Router();

// Public routes
router.get('/', WordPackController.getWordPacks);
router.get('/curated', WordPackController.getCuratedWordPacks);
router.get('/trending', WordPackController.getTrendingWordPacks);
router.get('/:id', optionalAuthenticate, WordPackController.getWordPackById);

// Protected routes
router.post('/', authenticate, WordPackController.createWordPack);
router.patch('/:id', authenticate, WordPackController.updateWordPack);
router.delete('/:id', authenticate, WordPackController.deleteWordPack);
router.post('/:id/rate', authenticate, WordPackController.rateWordPack);

export default router;
