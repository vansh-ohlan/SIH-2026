import { IParcelRepository, parcelRepository } from '../repositories/parcelRepository';
import { ParcelRecord, ParcelSearchResult, ConflictItem } from '../models/parcel';
import { ParcelNotFoundError } from '../utils/errors';

export class ParcelService {
  constructor(private readonly repo: IParcelRepository = parcelRepository) {}

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
}

export const parcelService = new ParcelService();
