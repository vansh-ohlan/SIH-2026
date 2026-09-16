import { Router } from 'express';
import { mapController } from '../controllers/mapController';
import { layerController } from '../controllers/layerController';

const router = Router();

// 6. GET /api/map/parcels
router.get('/parcels', (req, res, next) => mapController.getParcels(req, res, next));

// 7. GET /api/map/layers?type={type}&region={region}
router.get('/layers', (req, res, next) => layerController.getLayers(req, res, next));

export const mapRoutes = router;
