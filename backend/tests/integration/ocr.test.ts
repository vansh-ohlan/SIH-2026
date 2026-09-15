import request from 'supertest';
import { createApp } from '../../src/app/createApp';

describe('POST /api/ocr/extract', () => {
  const app = createApp();

  it('should extract structured fields from uploaded document file with exact 200 response shape', async () => {
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

  it('should return 422 error when no file is uploaded', async () => {
    const res = await request(app)
      .post('/api/ocr/extract')
      .expect('Content-Type', /json/)
      .expect(422);

    expect(res.body).toEqual({
      error: 'unreadable_document',
      message: 'OCR could not extract required fields'
    });
  });

  it('should return 422 error when file is flagged as unreadable', async () => {
    const fileBuffer = Buffer.from('Corrupted image payload');

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
