import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/register — citizen self-registration (strictly citizen role)
router.post('/register', (req, res, next) => authController.register(req, res, next));

// POST /api/auth/login — authenticate with username/email and password
router.post('/login', (req, res, next) => authController.login(req, res, next));

// POST /api/auth/dev-token — generate demo tokens for any role (development/demo access)
router.post('/dev-token', (req, res, next) => authController.generateDevToken(req, res, next));

// GET /api/auth/me — inspect current authenticated context
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

export const authRoutes = router;
