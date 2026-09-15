import { Request, Response, NextFunction } from 'express';
import { mapService } from '../services/mapService';

export class MapController {
  public async getParcels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const geojson = await mapService.getParcelsFeatureCollection();
      res.status(200).json(geojson);
    } catch (error) {
      next(error);
    }
  }
}

export const mapController = new MapController();
