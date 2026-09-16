import { Request, Response, NextFunction } from 'express';
import { ocrService } from '../services/ocrService';
import { decisionSupportService } from '../services/decisionSupportService';
import { UnreadableDocumentError, ValidationError } from '../utils/errors';

export class OcrController {
  /**
   * 5. POST /api/ocr/extract
   * Frozen API Contract for standard document field extraction.
   */
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

  /**
   * POST /api/ocr/decision-support
   * Generates comprehensive cross-data validation and explainable anomaly report
   * comparing OCR document extraction against PostGIS parcel database.
   */
  public async getDecisionSupport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ulpid = req.body.ulpid || req.query.ulpid;
      if (!ulpid || typeof ulpid !== 'string') {
        throw new ValidationError('A valid target ULPID is required for decision support cross-validation');
      }

      const file = req.file;
      let ocrData;

      if (file) {
        ocrData = await ocrService.extractFromDocument(file.buffer, file.originalname);
      } else if (req.body.owner && req.body.area) {
        ocrData = {
          owner: String(req.body.owner),
          area: Number(req.body.area),
          survey_no: String(req.body.survey_no || ''),
          confidence: Number(req.body.confidence ?? 0.85)
        };
      } else {
        // Fallback default for targeted parcel
        ocrData = await ocrService.extractFromDocument(Buffer.from('Demo RoR Payload'), `${ulpid}_ror.pdf`);
      }

      const report = await decisionSupportService.generateDecisionSupport(ulpid, ocrData);
      res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  }
}

export const ocrController = new OcrController();

