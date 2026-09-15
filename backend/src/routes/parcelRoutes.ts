import { Router } from 'express';
import { parcelController } from '../controllers/parcelController';

const router = Router();

// 2. GET /api/parcel/search?q={query}
router.get('/search', (req, res, next) => parcelController.searchParcels(req, res, next));

// 3. GET /api/parcel/{ulpid}/conflicts
router.get('/:ulpid/conflicts', (req, res, next) => parcelController.getConflicts(req, res, next));

// 1. GET /api/parcel/{ulpid}
router.get('/:ulpid', (req, res, next) => parcelController.getParcelByUlpid(req, res, next));

export const parcelRoutes = router;
