import { OcrService } from '../../src/services/ocrService';
import { UnreadableDocumentError } from '../../src/utils/errors';

describe('OcrService (OCR Pipeline)', () => {
  let ocrService: OcrService;

  beforeEach(() => {
    ocrService = new OcrService();
  });

  it('should extract structured fields from standard document buffer with >= 0.85 confidence', async () => {
    const fileBuffer = Buffer.from('Valid Jamabandi RoR Scan Content');
    const result = await ocrService.extractFromDocument(fileBuffer, 'sample_jamabandi.pdf');

    expect(result).toEqual({
      owner: 'Suresh Singh',
      area: 980,
      survey_no: '142/3',
      confidence: 0.87
    });
    expect(result.confidence).toBeGreaterThanOrEqual(0.60);
  });

  it('should throw UnreadableDocumentError when buffer is empty or missing', async () => {
    await expect(ocrService.extractFromDocument(undefined)).rejects.toThrow(UnreadableDocumentError);
    await expect(ocrService.extractFromDocument(Buffer.alloc(0))).rejects.toThrow(UnreadableDocumentError);
  });

  it('should throw UnreadableDocumentError when file name indicates unreadable/corrupt document', async () => {
    const fileBuffer = Buffer.from('Corrupt document binary payload');
    await expect(ocrService.extractFromDocument(fileBuffer, 'unreadable_scan.png')).rejects.toThrow(
      UnreadableDocumentError
    );
    await expect(ocrService.extractFromDocument(fileBuffer, 'corrupted_file.pdf')).rejects.toThrow(
      UnreadableDocumentError
    );
  });

  it('should return low confidence (<0.60) for blurry document fixture', async () => {
    const fileBuffer = Buffer.from('Blurry low resolution camera photo');
    const result = await ocrService.extractFromDocument(fileBuffer, 'blurry_ror_photo.jpg');

    expect(result.confidence).toBeLessThan(0.60);
    expect(result.confidence).toBe(0.52);
    expect(result.owner).toBeDefined();
    expect(result.area).toBeDefined();
  });

  it('should extract Tamil Nadu Patta / Chitta document fixture correctly', async () => {
    const fileBuffer = Buffer.from('Tamil Nadu Patta Chitta scan');
    const result = await ocrService.extractFromDocument(fileBuffer, 'tamilnadu_patta_84102.pdf');

    expect(result).toEqual({
      owner: 'K. Venkatesan',
      area: 3200,
      survey_no: '284/1B',
      confidence: 0.94
    });
  });

  it('should handle document fixture with missing survey number', async () => {
    const fileBuffer = Buffer.from('Document with damaged survey column');
    const result = await ocrService.extractFromDocument(fileBuffer, 'missing_survey_doc.png');

    expect(result.survey_no).toBe('');
    expect(result.owner).toBe('Suresh Singh');
  });

  it('should handle document fixture with mismatched owner', async () => {
    const fileBuffer = Buffer.from('Document with differing owner');
    const result = await ocrService.extractFromDocument(fileBuffer, 'owner_mismatch_record.pdf');

    expect(result.owner).toBe('Gurpreet Singh');
  });
});
