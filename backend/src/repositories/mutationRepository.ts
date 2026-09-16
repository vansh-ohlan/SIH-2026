import {
  MutationRequest,
  MutationResponse,
  MutationAuditRecord
} from '../models/mutation';
import { postgisMutationRepository } from './postgisMutationRepository';

export interface IMutationRepository {
  recordMutation(ulpid: string, request: MutationRequest): Promise<MutationResponse>;
  getHistory(ulpid: string): Promise<MutationAuditRecord[]>;
}

// Default production repository is PostgreSQL + PostGIS
export const mutationRepository: IMutationRepository = postgisMutationRepository;
export { postgisMutationRepository };
