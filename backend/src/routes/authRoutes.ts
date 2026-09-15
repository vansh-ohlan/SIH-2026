import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/dev-token — generate demo tokens for any role
router.post('/dev-token', (req, res, next) => authController.generateDevToken(req, res, next));

// GET /api/auth/me — inspect current authenticated context
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

export const authRoutes = router;
