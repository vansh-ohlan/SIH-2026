import { logger } from '../../utils/logger';

export interface NgdrsDeedRecord {
  ulpid: string;
  deed_number: string;
  registration_date: string;
  sub_registrar_office: string;
  registered_party: string;
  market_value_inr: number;
  stamp_duty_paid_inr: number;
  encumbrance_status: 'clear' | 'mortgaged' | 'disputed' | 'under_review';
  pending_mutation_claim?: {
    claimant: string;
    filing_date: string;
    nature_of_transfer: string;
  };
}

export interface INgdrsRegistrationAdapter {
  fetchDeedByUlpid(ulpid: string): Promise<NgdrsDeedRecord | null>;
}

/**
 * Adapter for NGDRS (National Generic Document Registration System) / State Registry.
 * Supplies registered deed metadata and legal encumbrance statuses.
 */
export class NgdrsRegistrationAdapter implements INgdrsRegistrationAdapter {
  public async fetchDeedByUlpid(ulpid: string): Promise<NgdrsDeedRecord | null> {
    logger.info(`[DEMO ADAPTER] Fetching NGDRS registered deed for ULPID: ${ulpid}`);

    const syntheticDeedRecords: Record<string, NgdrsDeedRecord> = {
      'PB-LDH-0042': {
        ulpid: 'PB-LDH-0042',
        deed_number: 'DEED-2011-LDH-4821',
        registration_date: '2011-04-12',
        sub_registrar_office: 'SRO Ludhiana East',
        registered_party: 'Ramesh Kumar',
        market_value_inr: 8125000,
        stamp_duty_paid_inr: 487500,
        encumbrance_status: 'under_review',
        pending_mutation_claim: {
          claimant: 'Ramesh Kumar',
          filing_date: '2026-09-08',
          nature_of_transfer: 'Boundary Survey Reconciliation'
        }
      },
      'PB-LDH-0043': {
        ulpid: 'PB-LDH-0043',
        deed_number: 'DEED-2016-LDH-1902',
        registration_date: '2016-08-20',
        sub_registrar_office: 'SRO Ludhiana East',
        registered_party: 'Suresh Singh',
        market_value_inr: 4410000,
        stamp_duty_paid_inr: 264600,
        encumbrance_status: 'clear'
      },
      'CH-SEC-1701': {
        ulpid: 'CH-SEC-1701',
        deed_number: 'DEED-2015-CHD-9021',
        registration_date: '2015-11-04',
        sub_registrar_office: 'SRO Chandigarh Urban',
        registered_party: 'Rajiv Walia & Associates',
        market_value_inr: 36000000,
        stamp_duty_paid_inr: 2160000,
        encumbrance_status: 'clear'
      },
      'TN-SPR-0814': {
        ulpid: 'TN-SPR-0814',
        deed_number: 'DEED-2008-SPR-0041',
        registration_date: '2008-01-22',
        sub_registrar_office: 'SRO Sriperumbudur',
        registered_party: 'K. Venkatesan',
        market_value_inr: 11200000,
        stamp_duty_paid_inr: 784000,
        encumbrance_status: 'clear'
      }
    };

    return syntheticDeedRecords[ulpid] ?? null;
  }
}

export const ngdrsRegistrationAdapter = new NgdrsRegistrationAdapter();
