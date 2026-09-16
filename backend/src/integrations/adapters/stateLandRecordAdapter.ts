import { logger } from '../../utils/logger';

export interface StateRoRRecord {
  ulpid: string;
  state: string;
  district: string;
  tehsil: string;
  village: string;
  khewat_no: string;
  khatauni_no: string;
  khasra_no: string;
  owner_name: string;
  father_name: string;
  share: string;
  declared_area_sqm: number;
  land_type: string;
  last_mutation_date: string;
}

export interface IStateLandRecordAdapter {
  fetchRoRByUlpid(ulpid: string): Promise<StateRoRRecord | null>;
}

/**
 * Adapter for State Land Records (Bhulekh / Jamabandi / Patta systems).
 * In production, this would connect to State NIC / DILRMP APIs.
 * In prototype, returns deterministic synthetic fixtures labeled DEMO/SYNTHETIC.
 */
export class StateLandRecordAdapter implements IStateLandRecordAdapter {
  public async fetchRoRByUlpid(ulpid: string): Promise<StateRoRRecord | null> {
    logger.info(`[DEMO ADAPTER] Fetching State RoR record for ULPID: ${ulpid}`);

    const syntheticRoRRecords: Record<string, StateRoRRecord> = {
      'PB-LDH-0042': {
        ulpid: 'PB-LDH-0042',
        state: 'Punjab',
        district: 'Ludhiana',
        tehsil: 'Ludhiana East',
        village: 'Burj Littan',
        khewat_no: '74/82',
        khatauni_no: '112',
        khasra_no: '142/3',
        owner_name: 'Ramesh Kumar',
        father_name: 'Suresh Kumar',
        share: '1/1 (Full)',
        declared_area_sqm: 1250,
        land_type: 'Residential (Gair Mumkin Abadi)',
        last_mutation_date: '2011-04-12'
      },
      'PB-LDH-0043': {
        ulpid: 'PB-LDH-0043',
        state: 'Punjab',
        district: 'Ludhiana',
        tehsil: 'Ludhiana East',
        village: 'Burj Littan',
        khewat_no: '88/90',
        khatauni_no: '145',
        khasra_no: '142/4',
        owner_name: 'Suresh Singh',
        father_name: 'Jaswant Singh',
        share: '1/1 (Full)',
        declared_area_sqm: 980,
        land_type: 'Agricultural (Chahi / Irrigated)',
        last_mutation_date: '2016-08-20'
      },
      'CH-SEC-1701': {
        ulpid: 'CH-SEC-1701',
        state: 'Chandigarh',
        district: 'Chandigarh',
        tehsil: 'Chandigarh Urban',
        village: 'Sector 17',
        khewat_no: 'SEC-17-C',
        khatauni_no: '004',
        khasra_no: 'PLOT-84',
        owner_name: 'Rajiv Walia & Associates',
        father_name: 'N/A (Corporate Entity)',
        share: '1/1 (Full)',
        declared_area_sqm: 2400,
        land_type: 'Commercial (SCO Commercial Complex)',
        last_mutation_date: '2015-11-04'
      },
      'TN-SPR-0814': {
        ulpid: 'TN-SPR-0814',
        state: 'Tamil Nadu',
        district: 'Kanchipuram',
        tehsil: 'Sriperumbudur',
        village: 'Nemili Village',
        khewat_no: 'PAT-84102',
        khatauni_no: '09',
        khasra_no: '284/1B',
        owner_name: 'K. Venkatesan',
        father_name: 'Krishnan',
        share: '1/1 (Full)',
        declared_area_sqm: 3200,
        land_type: 'Agricultural (Nanja / Wet Land)',
        last_mutation_date: '2008-01-22'
      }
    };

    return syntheticRoRRecords[ulpid] ?? null;
  }
}

export const stateLandRecordAdapter = new StateLandRecordAdapter();
