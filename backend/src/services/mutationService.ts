import { IMutationRepository, mutationRepository } from '../repositories/mutationRepository';
import { MutationRequest, MutationResponse } from '../models/mutation';
import { IParcelRepository, parcelRepository } from '../repositories/parcelRepository';
import { ParcelNotFoundError } from '../utils/errors';

export class MutationService {
  constructor(
    private readonly repo: IMutationRepository = mutationRepository,
    private readonly parcelRepo: IParcelRepository = parcelRepository
  ) {}

  public async recordDecision(ulpid: string, request: MutationRequest): Promise<MutationResponse> {
    const parcel = await this.parcelRepo.findByUlpid(ulpid);
    if (!parcel) {
      throw new ParcelNotFoundError();
    }

    return this.repo.recordMutation(ulpid, request);
  }
}

export const mutationService = new MutationService();
