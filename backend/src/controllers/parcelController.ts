import { Request, Response, NextFunction } from 'express';
import { parcelService } from '../services/parcelService';
import { parcelParamSchema, parcelSearchQuerySchema } from '../schemas/parcelSchema';

export class ParcelController {
  public async getParcelByUlpid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ulpid } = parcelParamSchema.parse(req.params);
      const parcel = await parcelService.getParcelByUlpid(ulpid);
      res.status(200).json(parcel);
    } catch (error) {
      next(error);
    }
  }

  public async searchParcels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q } = parcelSearchQuerySchema.parse(req.query);
      const results = await parcelService.searchParcels(q || '');
      res.status(200).json(results);
    } catch (error) {
      next(error);
    }
  }

  public async getConflicts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ulpid } = parcelParamSchema.parse(req.params);
      const conflicts = await parcelService.getParcelConflicts(ulpid);
      res.status(200).json(conflicts);
    } catch (error) {
      next(error);
    }
  }
}

export const parcelController = new ParcelController();
