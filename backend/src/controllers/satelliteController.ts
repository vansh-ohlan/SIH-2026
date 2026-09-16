import { Request, Response, NextFunction } from 'express';
import { mockSatelliteService } from '../services/satelliteService';

export class SatelliteController {
  // GET /api/ai/satellite/:ulpid
  async getChanges(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ulpid } = req.params;
      const data = await mockSatelliteService.getChanges(ulpid);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
}

export const satelliteController = new SatelliteController();
