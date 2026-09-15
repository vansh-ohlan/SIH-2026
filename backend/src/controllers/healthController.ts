import { Request, Response } from 'express';
import { HealthResponse } from '../models/health';

export class HealthController {
  public getHealth(_req: Request, res: Response): void {
    const response: HealthResponse = {
      status: 'ok'
    };
    res.status(200).json(response);
  }
}

export const healthController = new HealthController();
