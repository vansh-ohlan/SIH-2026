import { Router } from 'express';
import { mutationController } from '../controllers/mutationController';

const router = Router();

// 4. POST /api/mutation/{ulpid}
router.post('/:ulpid', (req, res, next) => mutationController.recordMutation(req, res, next));

export const mutationRoutes = router;
