// Mock Satellite Service – deterministic demo data
// No real satellite imagery is used.
import { SatelliteChange } from '../models/ai';

// Simple mock data per parcel (or default)
const MOCK_SAT_DATA: Record<string, SatelliteChange> = {
  'PB-LDH-0042': {
    ndvi: 0.67,
    sar: 0.45,
    changeDetected: true,
  },
  // Default fallback – no significant change
  'default': {
    ndvi: 0.60,
    sar: 0.30,
    changeDetected: false,
  },
};

export class MockSatelliteService {
  async getChanges(ulpid: string): Promise<SatelliteChange> {
    return MOCK_SAT_DATA[ulpid] ?? MOCK_SAT_DATA['default'];
  }
}

export const mockSatelliteService = new MockSatelliteService();
