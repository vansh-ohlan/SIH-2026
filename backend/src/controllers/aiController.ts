import { Request, Response, NextFunction } from 'express';
import { mockAIService } from '../services/mockAIService';

export class AIController {
  // POST /api/ai/analyze/:ulpid
  async analyzeParcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ulpid } = req.params;
      const analysis = await mockAIService.analyzeParcel(ulpid);
      res.status(200).json(analysis);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/ai/ask/:ulpid
  async askParcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ulpid } = req.params;
      const { question } = req.body as { question: string };
      const answer = await mockAIService.askParcel(ulpid, question);
      res.status(200).json(answer);
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AIController();

