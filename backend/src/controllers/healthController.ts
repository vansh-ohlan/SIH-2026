import { Request, Response } from 'express';
import { HealthResponse } from '../models/health';
import { db } from '../db/pool';

export class HealthController {
  public async getHealth(_req: Request, res: Response): Promise<void> {
    // Verify database connectivity in background/health check
    await db.healthCheck();

    const response: HealthResponse = {
      status: 'ok'
    };
    res.status(200).json(response);
  }
}

export const healthController = new HealthController();
