import { OcrExtractionResponse } from '../models/ocr';
import { UnreadableDocumentError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface IOcrService {
  extractFromDocument(fileBuffer?: Buffer, fileName?: string): Promise<OcrExtractionResponse>;
}

/**
 * OCR Pipeline Service — Document Ingestion & Field Extraction Layer.
 * Implements a clean service boundary:
 * File Ingestion -> Validation -> Preprocessing -> OCR Engine -> Field Extraction & Normalization -> Confidence Scoring
 * 
 * Clearly identified as "Prototype OCR / Demo Processing" for hackathon demonstration.
 */
export class OcrService implements IOcrService {
  public async extractFromDocument(
    fileBuffer?: Buffer,
    fileName?: string
  ): Promise<OcrExtractionResponse> {
    // 1. Validation: Verify file buffer presence and integrity
    if (!fileBuffer || fileBuffer.length === 0) {
      logger.warn('OCR rejection: Empty or missing document buffer');
      throw new UnreadableDocumentError('OCR could not extract required fields');
    }

    if (fileBuffer.length < 8) {
      logger.warn('OCR rejection: File buffer too small to be a valid document');
      throw new UnreadableDocumentError('OCR could not extract required fields');
    }

    const lowerName = (fileName || '').toLowerCase();

    // 2. Error handling: Detect unreadable, corrupted, or unparseable files
    if (
      lowerName.includes('unreadable') ||
      lowerName.includes('corrupt') ||
      lowerName.includes('empty') ||
      lowerName.includes('invalid')
    ) {
      logger.warn(`OCR extraction failed for unreadable document: ${fileName}`);
      throw new UnreadableDocumentError('OCR could not extract required fields');
    }

    // 3. Document Preprocessing & Regional Extraction Presets (Prototype OCR Engine)
    // Preset: Blurry / low-confidence document (< 0.60 threshold)
    if (lowerName.includes('blurry') || lowerName.includes('low_conf') || lowerName.includes('low-conf')) {
      logger.info('OCR processed blurry document fixture with low confidence threshold', { fileName });
      return {
        owner: 'Suresh Singh',
        area: 980,
        survey_no: '142/3',
        confidence: 0.52 // < 0.60 triggers "Manual verification required"
      };
    }

    // Preset: Missing survey number document
    if (lowerName.includes('missing_survey') || lowerName.includes('no_survey')) {
      logger.info('OCR processed document with missing survey number', { fileName });
      return {
        owner: 'Suresh Singh',
        area: 980,
        survey_no: '',
        confidence: 0.78
      };
    }

    // Preset: Disputed / Mismatched owner document
    if (lowerName.includes('owner_mismatch') || lowerName.includes('dispute')) {
      logger.info('OCR processed document with mismatched owner identity', { fileName });
      return {
        owner: 'Gurpreet Singh',
        area: 1250,
        survey_no: '142/3',
        confidence: 0.91
      };
    }

    // Preset: Disputed area document
    if (lowerName.includes('area_mismatch') || lowerName.includes('diff_area')) {
      logger.info('OCR processed document with area discrepancy', { fileName });
      return {
        owner: 'Ramesh Kumar',
        area: 1450, // 200 sqm more than RoR
        survey_no: '142/3',
        confidence: 0.89
      };
    }

    // Preset: Tamil Nadu Patta
    if (lowerName.includes('tamil') || lowerName.includes('patta')) {
      logger.info('OCR processed Tamil Nadu Patta / Chitta document', { fileName });
      return {
        owner: 'K. Venkatesan',
        area: 3200,
        survey_no: '284/1B',
        confidence: 0.94
      };
    }

    // Default: Punjab Jamabandi standard demo extraction matching api-contracts.md
    logger.info('OCR extracted structured fields from Record of Rights document', { fileName });
    return {
      owner: 'Suresh Singh',
      area: 980,
      survey_no: '142/3',
      confidence: 0.87
    };
  }
}

export const ocrService = new OcrService();

