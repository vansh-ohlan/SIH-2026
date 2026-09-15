import { Request, Response, NextFunction } from 'express';
import { mutationService } from '../services/mutationService';
import { parcelParamSchema } from '../schemas/parcelSchema';
import { mutationSchema } from '../schemas/mutationSchema';

export class MutationController {
  public async recordMutation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ulpid } = parcelParamSchema.parse(req.params);
      const input = mutationSchema.parse(req.body);
      const result = await mutationService.recordDecision(ulpid, input);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const mutationController = new MutationController();
