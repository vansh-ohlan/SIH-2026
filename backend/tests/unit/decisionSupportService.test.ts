import { DecisionSupportService } from '../../src/services/decisionSupportService';
import { IParcelRepository } from '../../src/repositories/parcelRepository';
import { ParcelRecord } from '../../src/models/parcel';

describe('DecisionSupportService (Anomaly & Cross-Data Engine)', () => {
  let mockRepo: jest.Mocked<IParcelRepository>;
  let service: DecisionSupportService;

  const sampleParcel: ParcelRecord = {
    ulpid: 'PB-LDH-0042',
    geometry: {
      type: 'Polygon',
      coordinates: [[[75.85, 30.90], [75.86, 30.90], [75.86, 30.91], [75.85, 30.91], [75.85, 30.90]]]
    },
    owner: { name: 'Ramesh Kumar', since: '2011-04-12' },
    area_sqm: 1250,
    land_use: 'Residential',
    tax_status: { paid: true, last_paid: '2026-03-01', dues: 0 },
    mutations: []
  };

  beforeEach(() => {
    mockRepo = {
      findByUlpid: jest.fn(),
      search: jest.fn(),
      findConflictsByUlpid: jest.fn(),
      getAllGeoJson: jest.fn()
    };
    service = new DecisionSupportService(mockRepo);
  });

  it('should flag low OCR confidence (< 0.60) with "Manual verification required"', async () => {
    mockRepo.findByUlpid.mockResolvedValue(sampleParcel);

    const report = await service.generateDecisionSupport('PB-LDH-0042', {
      owner: 'Ramesh Kumar',
      area: 1250,
      survey_no: '142/3',
      confidence: 0.52
    });

    expect(report.confidence_assessment.status).toBe('manual_verification_required');
    expect(report.confidence_assessment.display_message).toBe('Manual verification required');
    expect(report.anomalies.some((a) => a.type === 'low_ocr_confidence')).toBe(true);
    expect(report.recommended_review_status).toBe('needs_review');
  });

  it('should flag owner mismatch anomaly when OCR owner differs from database titleholder', async () => {
    mockRepo.findByUlpid.mockResolvedValue(sampleParcel);

    const report = await service.generateDecisionSupport('PB-LDH-0042', {
      owner: 'Harpreet Singh',
      area: 1250,
      survey_no: '142/3',
      confidence: 0.88
    });

    const ownerAnomaly = report.anomalies.find((a) => a.type === 'owner_mismatch');
    expect(ownerAnomaly).toBeDefined();
    expect(ownerAnomaly?.severity).toBe('high');
    expect(ownerAnomaly?.what_compared).toContain('Extracted Deed/RoR Titleholder');
    expect(ownerAnomaly?.what_differs).toContain('Harpreet Singh');
    expect(ownerAnomaly?.why_flagged).toContain('clerical identity mismatch');
    expect(report.recommended_review_status).toBe('needs_review');
  });

  it('should flag area mismatch between RoR and surveyed area', async () => {
    mockRepo.findByUlpid.mockResolvedValue(sampleParcel);

    const report = await service.generateDecisionSupport('PB-LDH-0042', {
      owner: 'Ramesh Kumar',
      area: 1250,
      survey_no: '142/3',
      confidence: 0.90
    });

    const areaAnomaly = report.anomalies.find((a) => a.type === 'area_mismatch');
    expect(areaAnomaly).toBeDefined();
    expect(areaAnomaly?.severity).toBe('medium');
    expect(areaAnomaly?.what_differs).toContain('1250 sqm');
    expect(areaAnomaly?.what_differs).toContain('1180 sqm');
    expect(areaAnomaly?.what_differs).toContain('70 sqm');
  });

  it('should flag missing survey number when unextracted', async () => {
    mockRepo.findByUlpid.mockResolvedValue(sampleParcel);

    const report = await service.generateDecisionSupport('PB-LDH-0042', {
      owner: 'Ramesh Kumar',
      area: 1250,
      survey_no: '',
      confidence: 0.85
    });

    const missingSurveyAnomaly = report.anomalies.find((a) => a.type === 'missing_survey_no');
    expect(missingSurveyAnomaly).toBeDefined();
    expect(missingSurveyAnomaly?.severity).toBe('medium');
    expect(missingSurveyAnomaly?.what_differs).toContain('Empty / Unextracted');
  });

  it('should flag OCR area discrepancy when document claims different area than official RoR', async () => {
    mockRepo.findByUlpid.mockResolvedValue(sampleParcel);

    const report = await service.generateDecisionSupport('PB-LDH-0042', {
      owner: 'Ramesh Kumar',
      area: 1400, // 150 sqm difference
      survey_no: '142/3',
      confidence: 0.92
    });

    const ocrAreaAnomaly = report.anomalies.find((a) => a.type === 'ocr_area_discrepancy');
    expect(ocrAreaAnomaly).toBeDefined();
    expect(ocrAreaAnomaly?.severity).toBe('high');
    expect(ocrAreaAnomaly?.what_differs).toContain('1400 sqm');
  });

  it('should return acceptable_for_review and approved_candidate when all records align and confidence >= 0.60', async () => {
    const alignedParcel: ParcelRecord = {
      ulpid: 'PB-LDH-0043',
      geometry: {
        type: 'Polygon',
        coordinates: [[[75.86, 30.90], [75.87, 30.90], [75.87, 30.91], [75.86, 30.91], [75.86, 30.90]]]
      },
      owner: { name: 'Suresh Singh', since: '2016-08-20' },
      area_sqm: 980,
      land_use: 'Agricultural',
      tax_status: { paid: false, last_paid: '2025-11-10', dues: 3200 },
      mutations: []
    };
    mockRepo.findByUlpid.mockResolvedValue(alignedParcel);

    const report = await service.generateDecisionSupport('PB-LDH-0043', {
      owner: 'Suresh Singh',
      area: 980,
      survey_no: '142/3',
      confidence: 0.87
    });

    expect(report.confidence_assessment.status).toBe('acceptable_for_review');
    expect(report.confidence_assessment.display_message).toBe('Extraction confidence acceptable for review');
    expect(report.anomalies.length).toBe(0);
    expect(report.recommended_review_status).toBe('approved_candidate');
  });
});
