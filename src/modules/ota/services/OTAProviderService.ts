import { BaseService } from "@lib/baseService";
import { NotFoundError, ConflictError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaOTAProviderRepository } from "../repositories/PrismaOTAProviderRepository";
import type { OTAProvider, OTAProviderFilter } from "../types";
import type {
  CreateOTAProviderDtoType,
  UpdateOTAProviderDtoType,
  OTAProviderFilterDtoType,
} from "../dto";
import { OTA_ERRORS } from "../constants";

export class OTAProviderService extends BaseService {
  protected readonly moduleName = "OTAProviderService";

  constructor(private readonly providerRepo: PrismaOTAProviderRepository) {
    super();
  }

  async listProviders(filter: OTAProviderFilterDtoType): Promise<PaginatedResult<OTAProvider>> {
    return this.execute("listProviders", async () => {
      const f: OTAProviderFilter = {
        status: filter.status,
        page: filter.page,
        limit: filter.limit,
      };
      return this.providerRepo.findManyFiltered(f);
    });
  }

  async getProvider(id: string): Promise<OTAProvider> {
    return this.execute("getProvider", async () => {
      const provider = await this.providerRepo.findById(id);
      if (!provider) throw new NotFoundError(OTA_ERRORS.PROVIDER_NOT_FOUND);
      return provider;
    });
  }

  async createProvider(dto: CreateOTAProviderDtoType): Promise<OTAProvider> {
    return this.execute("createProvider", async () => {
      const existing = await this.providerRepo.findByCode(dto.providerCode);
      if (existing) throw new ConflictError(OTA_ERRORS.PROVIDER_CODE_EXISTS);

      return this.providerRepo.create({
        providerName: dto.providerName,
        providerCode: dto.providerCode,
        description: dto.description,
        webhookUrl: dto.webhookUrl,
        metadata: dto.metadata,
      });
    });
  }

  async updateProvider(id: string, dto: UpdateOTAProviderDtoType): Promise<OTAProvider> {
    return this.execute("updateProvider", async () => {
      const provider = await this.providerRepo.findById(id);
      if (!provider) throw new NotFoundError(OTA_ERRORS.PROVIDER_NOT_FOUND);

      if (dto.providerCode !== undefined) {
        const existing = await this.providerRepo.findByCode(dto.providerCode);
        if (existing && existing.id !== id) {
          throw new ConflictError(OTA_ERRORS.PROVIDER_CODE_EXISTS);
        }
      }

      return this.providerRepo.update(id, {
        providerName: dto.providerName,
        providerCode: dto.providerCode,
        status: dto.status,
        description: dto.description,
        webhookUrl: dto.webhookUrl,
        metadata: dto.metadata,
      });
    });
  }

  async deleteProvider(id: string): Promise<void> {
    return this.execute("deleteProvider", async () => {
      const provider = await this.providerRepo.findById(id);
      if (!provider) throw new NotFoundError(OTA_ERRORS.PROVIDER_NOT_FOUND);
      await this.providerRepo.hardDelete(id);
    });
  }
}
