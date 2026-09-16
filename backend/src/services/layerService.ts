import { postgisLayerRepository, ILayerRepository } from '../repositories/postgisLayerRepository';

export class LayerService {
  constructor(private readonly repo: ILayerRepository = postgisLayerRepository) {}

  public async getEncroachmentsByRegion(regionId: string): Promise<any[]> {
    return this.repo.getEncroachmentsByRegion(regionId);
  }

  public async getUtilitiesByRegion(regionId: string): Promise<any[]> {
    return this.repo.getUtilitiesByRegion(regionId);
  }
}

export const layerService = new LayerService();
