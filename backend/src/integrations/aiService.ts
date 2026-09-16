import { config } from '../config';
import { OcrExtractionResponse } from '../models/ocr';
import { logger } from '../utils/logger';

/**
 * Interface for communicating with the AI/ML microservice (FastAPI / PaddleOCR).
 */
export interface IAiServiceClient {
  extractDocument(fileBuffer: Buffer, fileName: string): Promise<OcrExtractionResponse>;
}

export class AiServiceClient implements IAiServiceClient {
  private serviceUrl: string;

  constructor(serviceUrl = config.AI_ML_SERVICE_URL) {
    this.serviceUrl = serviceUrl;
  }

  public async extractDocument(_fileBuffer: Buffer, fileName: string): Promise<OcrExtractionResponse> {
    logger.info(`Forwarding OCR extraction request to AI/ML service at ${this.serviceUrl}`, { fileName });

    // Stage 1 stub: Return synthetic extracted document data matching api contracts
    return {
      owner: 'Suresh Singh',
      area: 980,
      survey_no: '142/3',
      confidence: 0.87
    };
  }
}

export const aiServiceClient = new AiServiceClient();
