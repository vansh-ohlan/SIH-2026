import { Router } from 'express';
import { ocrController } from '../controllers/ocrController';
import { upload } from '../middleware/upload';

const router = Router();

// 5. POST /api/ocr/extract
router.post('/extract', upload.single('file'), (req, res, next) => ocrController.extract(req, res, next));

export const ocrRoutes = router;
