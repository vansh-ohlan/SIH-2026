import { config } from '../config';
import { OcrExtractionResponse, DecisionSupportReport, DecisionSupportFinding } from '../models/ocr';
import { ocrService } from '../services/ocrService';
import { decisionSupportService } from '../services/decisionSupportService';
import { logger } from '../utils/logger';

/**
 * Interface for AI/ML service boundaries and decision support layer.
 * Allows a future live ML microservice (e.g. FastAPI + PaddleOCR + Isolation Forest)
 * to seamlessly plug in while maintaining deterministic fallback.
 */
export interface IAiServiceClient {
  extractDocument(fileBuffer: Buffer, fileName: string): Promise<OcrExtractionResponse>;
  analyzeDocument(fileBuffer: Buffer, fileName: string): Promise<OcrExtractionResponse>;
  detectAnomalies(
    ocrData: OcrExtractionResponse,
    storedParcel: {
      owner_name: string;
      ror_area_sqm: number;
      surveyed_area_sqm: number;
      land_use: string;
    } | null
  ): DecisionSupportFinding[];
  generateDecisionSupport(ulpid: string, ocrData: OcrExtractionResponse): Promise<DecisionSupportReport>;
}

export class AiServiceClient implements IAiServiceClient {
  private serviceUrl: string;

  constructor(serviceUrl = config.AI_ML_SERVICE_URL) {
    this.serviceUrl = serviceUrl;
  }

  public async extractDocument(fileBuffer: Buffer, fileName: string): Promise<OcrExtractionResponse> {
    logger.info(`Extracting document fields via OCR pipeline service (target AI URL: ${this.serviceUrl})`, { fileName });
    return ocrService.extractFromDocument(fileBuffer, fileName);
  }

  public async analyzeDocument(fileBuffer: Buffer, fileName: string): Promise<OcrExtractionResponse> {
    return this.extractDocument(fileBuffer, fileName);
  }

  public detectAnomalies(
    ocrData: OcrExtractionResponse,
    storedParcel: {
      owner_name: string;
      ror_area_sqm: number;
      surveyed_area_sqm: number;
      land_use: string;
    } | null
  ): DecisionSupportFinding[] {
    return decisionSupportService.detectAnomalies(ocrData, storedParcel);
  }

  public async generateDecisionSupport(
    ulpid: string,
    ocrData: OcrExtractionResponse
  ): Promise<DecisionSupportReport> {
    return decisionSupportService.generateDecisionSupport(ulpid, ocrData);
  }
}

export const aiServiceClient = new AiServiceClient();

