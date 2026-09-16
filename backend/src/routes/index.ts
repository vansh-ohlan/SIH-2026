import { Router } from 'express';
import { healthRoutes } from './healthRoutes';
import { parcelRoutes } from './parcelRoutes';
import { mutationRoutes } from './mutationRoutes';
import { ocrRoutes } from './ocrRoutes';
import { mapRoutes } from './mapRoutes';
import { authRoutes } from './authRoutes';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/parcel', parcelRoutes);
apiRouter.use('/mutation', mutationRoutes);
apiRouter.use('/ocr', ocrRoutes);
apiRouter.use('/map', mapRoutes);

export { apiRouter };
