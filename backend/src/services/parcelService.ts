import { IParcelRepository, parcelRepository } from '../repositories/parcelRepository';
import { ParcelRecord, ParcelSearchResult, ConflictItem, ParcelReconciliationReport } from '../models/parcel';
import { parcelReconciliationService, IParcelReconciliationService } from './parcelReconciliationService';
import { ParcelNotFoundError } from '../utils/errors';

export class ParcelService {
  constructor(
    private readonly repo: IParcelRepository = parcelRepository,
    private readonly reconciliationService: IParcelReconciliationService = parcelReconciliationService
  ) {}

  public async getParcelByUlpid(ulpid: string): Promise<ParcelRecord> {
    const parcel = await this.repo.findByUlpid(ulpid);
    if (!parcel) {
      throw new ParcelNotFoundError();
    }
    return parcel;
  }

  public async searchParcels(query: string): Promise<ParcelSearchResult[]> {
    return this.repo.search(query);
  }

  public async getParcelConflicts(ulpid: string): Promise<ConflictItem[]> {
    return this.repo.findConflictsByUlpid(ulpid);
  }

  public async getParcelReconciliation(ulpid: string): Promise<ParcelReconciliationReport> {
    const parcel = await this.repo.findByUlpid(ulpid);
    if (!parcel) {
      throw new ParcelNotFoundError();
    }
    return this.reconciliationService.reconcileParcel(ulpid);
  }
}

export const parcelService = new ParcelService();

