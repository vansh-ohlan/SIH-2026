import request from 'supertest';
import { createApp } from '../../src/app/createApp';
import { authService } from '../../src/services/authService';

describe('Document Intelligence & Decision Support Integration', () => {
  const app = createApp();

  describe('1. Frozen OCR Contract: POST /api/ocr/extract', () => {
    it('should return exact 200 contract schema: owner, area, survey_no, confidence', async () => {
      const fileBuffer = Buffer.from('Synthetic Jamabandi RoR Scan Content');

      const res = await request(app)
        .post('/api/ocr/extract')
        .attach('file', fileBuffer, 'sample_ror.pdf')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toEqual({
        owner: 'Suresh Singh',
        area: 980,
        survey_no: '142/3',
        confidence: 0.87
      });
    });

    it('should return 422 unreadable_document error on unreadable document', async () => {
      const fileBuffer = Buffer.from('Corrupt document payload');

      const res = await request(app)
        .post('/api/ocr/extract')
        .attach('file', fileBuffer, 'unreadable_doc.png')
        .expect('Content-Type', /json/)
        .expect(422);

      expect(res.body).toEqual({
        error: 'unreadable_document',
        message: 'OCR could not extract required fields'
      });
    });
  });

  describe('2. Cross-Data Decision Support: POST /api/ocr/decision-support', () => {
    it('should generate explainable anomaly report when uploaded RoR has area or owner differences', async () => {
      const fileBuffer = Buffer.from('Synthetic Jamabandi Content');

      const res = await request(app)
        .post('/api/ocr/decision-support')
        .field('ulpid', 'PB-LDH-0042')
        .attach('file', fileBuffer, 'owner_mismatch_ror.pdf')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.ulpid).toBe('PB-LDH-0042');
      expect(res.body.ocr_extracted).toBeDefined();
      expect(res.body.confidence_assessment).toBeDefined();
      expect(Array.isArray(res.body.anomalies)).toBe(true);

      // Verify explainability fields for anomalies
      for (const anomaly of res.body.anomalies) {
        expect(anomaly.type).toBeDefined();
        expect(anomaly.description).toBeDefined();
        expect(anomaly.severity).toMatch(/^(low|medium|high)$/);
        expect(anomaly.what_compared).toBeDefined();
        expect(anomaly.what_differs).toBeDefined();
        expect(anomaly.why_flagged).toBeDefined();
      }

      expect(res.body.disclaimer).toContain('Decision Support Note');
    });

    it('should return 400 validation_error when ulpid is missing', async () => {
      const res = await request(app)
        .post('/api/ocr/decision-support')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body.error).toBe('validation_error');
    });
  });

  describe('3. Statutory Officer Adjudication & SHA-256 Audit Trail', () => {
    it('should record officer mutation decision with tamper-evident SHA-256 audit hash', async () => {
      const officerToken = authService.generateToken({
        role: 'revenue_officer',
        userId: 'OFF-102',
        name: 'Officer Sharma',
        officerId: 'OFF-102'
      });

      const res = await request(app)
        .post('/api/mutation/PB-LDH-0042')
        .set('Authorization', `Bearer ${officerToken.token}`)
        .send({
          decision: 'needs_review',
          officer_id: 'OFF-102',
          notes: 'Field survey dispatched to reconcile 70 sqm discrepancy between Jamabandi and PostGIS polygon'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.status).toBe('recorded');
      expect(res.body.audit_hash).toMatch(/^[a-f0-9]{64}$/i);
      expect(res.body.timestamp).toBeDefined();
    });

    it('should forbid citizen role from recording mutation decisions (403)', async () => {
      const citizenToken = authService.generateToken({
        role: 'citizen',
        userId: 'CIT-101',
        name: 'Citizen User'
      });

      const res = await request(app)
        .post('/api/mutation/PB-LDH-0042')
        .set('Authorization', `Bearer ${citizenToken.token}`)
        .send({
          decision: 'approved',
          officer_id: 'CIT-101',
          notes: 'Unauthorized citizen attempt'
        })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(res.body.error).toBe('forbidden');
    });
  });
});
