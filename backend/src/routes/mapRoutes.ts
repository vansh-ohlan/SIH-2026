import { Router } from 'express';
import { mapController } from '../controllers/mapController';

const router = Router();

// 6. GET /api/map/parcels
router.get('/parcels', (req, res, next) => mapController.getParcels(req, res, next));

export const mapRoutes = router;
