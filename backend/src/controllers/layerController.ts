import { Request, Response, NextFunction } from 'express';
import { layerService } from '../services/layerService';

export class LayerController {
  public async getLayers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const regionId = (req.query.region as string) || 'punjab';
      const type = (req.query.type as string);

      if (type === 'encroachments') {
        const data = await layerService.getEncroachmentsByRegion(regionId);
        res.status(200).json(data);
        return;
      }

      if (type === 'utilities') {
        const data = await layerService.getUtilitiesByRegion(regionId);
        res.status(200).json(data);
        return;
      }

      res.status(400).json({ error: 'Invalid layer type specified. Use type=encroachments or type=utilities.' });
    } catch (error) {
      next(error);
    }
  }
}

export const layerController = new LayerController();
