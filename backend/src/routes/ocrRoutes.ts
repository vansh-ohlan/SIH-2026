import { Router } from 'express';
import { ocrController } from '../controllers/ocrController';
import { upload } from '../middleware/upload';

const router = Router();

// 5. POST /api/ocr/extract (Contract Frozen)
router.post('/extract', upload.single('file'), (req, res, next) => ocrController.extract(req, res, next));

// POST /api/ocr/decision-support (Cross-data verification & anomaly intelligence)
router.post('/decision-support', upload.single('file'), (req, res, next) => ocrController.getDecisionSupport(req, res, next));

export const ocrRoutes = router;

