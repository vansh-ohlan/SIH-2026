import { Router } from 'express';
import { aiController } from '../controllers/aiController';

const router = Router();

// POST /api/ai/analyze/:ulpid
router.post('/analyze/:ulpid', (req, res, next) => aiController.analyzeParcel(req, res, next));

// POST /api/ai/ask/:ulpid
router.post('/ask/:ulpid', (req, res, next) => aiController.askParcel(req, res, next));

export const aiRoutes = router;
