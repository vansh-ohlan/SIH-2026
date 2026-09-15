import { OcrExtractionResponse } from '../models/ocr';
import { UnreadableDocumentError } from '../utils/errors';

export interface IOcrService {
  extractFromDocument(fileBuffer?: Buffer, fileName?: string): Promise<OcrExtractionResponse>;
}

/**
 * OCR Service Stub.
 * In later stages, this will invoke the PaddleOCR Python microservice or pipeline runner.
 */
export class OcrService implements IOcrService {
  public async extractFromDocument(
    fileBuffer?: Buffer,
    fileName?: string
  ): Promise<OcrExtractionResponse> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new UnreadableDocumentError('OCR could not extract required fields');
    }

    // Stub test hook: If file name contains 'corrupt' or 'unreadable', simulate extraction failure
    if (fileName && fileName.toLowerCase().includes('unreadable')) {
      throw new UnreadableDocumentError('OCR could not extract required fields');
    }

    // Deterministic demo response matching api-contracts.md
    return {
      owner: 'Suresh Singh',
      area: 980,
      survey_no: '142/3',
      confidence: 0.87
    };
  }
}

export const ocrService = new OcrService();
