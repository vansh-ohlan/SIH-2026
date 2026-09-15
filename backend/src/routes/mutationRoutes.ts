import { Router } from 'express';
import { mutationController } from '../controllers/mutationController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// 4. POST /api/mutation/{ulpid} (Protected: revenue_officer, registrar, admin)
router.post(
  '/:ulpid',
  authenticate,
  requireRole('revenue_officer', 'registrar', 'admin'),
  (req, res, next) => mutationController.recordMutation(req, res, next)
);

export const mutationRoutes = router;

