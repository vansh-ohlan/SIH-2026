import { Request, Response, NextFunction } from 'express';
import { ocrService } from '../services/ocrService';
import { UnreadableDocumentError } from '../utils/errors';

export class OcrController {
  public async extract(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        throw new UnreadableDocumentError('OCR could not extract required fields');
      }

      const result = await ocrService.extractFromDocument(file.buffer, file.originalname);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const ocrController = new OcrController();
