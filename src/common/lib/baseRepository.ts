import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import type { PaginatedResult, PaginationParams, Nullable } from "@shared-types";

export type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

export interface IBaseRepository<TModel, TCreateInput, TUpdateInput> {
  findById(id: string): Promise<Nullable<TModel>>;
  findMany(params: PaginationParams): Promise<PaginatedResult<TModel>>;
  create(data: TCreateInput): Promise<TModel>;
  update(id: string, data: TUpdateInput): Promise<TModel>;
  hardDelete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

export abstract class BaseRepository<TModel, TCreateInput, TUpdateInput>
  implements IBaseRepository<TModel, TCreateInput, TUpdateInput>
{
  protected readonly db: PrismaClient = prisma;

  abstract findById(id: string): Promise<Nullable<TModel>>;
  abstract findMany(params: PaginationParams): Promise<PaginatedResult<TModel>>;
  abstract create(data: TCreateInput): Promise<TModel>;
  abstract update(id: string, data: TUpdateInput): Promise<TModel>;
  abstract hardDelete(id: string): Promise<void>;

  async exists(id: string): Promise<boolean> {
    const record = await this.findById(id);
    return record !== null;
  }

  protected async withTransaction<T>(
    fn: (tx: PrismaTransactionClient) => Promise<T>
  ): Promise<T> {
    return this.db.$transaction(fn);
  }

  protected buildPaginationMeta(
    total: number,
    params: PaginationParams
  ): PaginatedResult<TModel>["meta"] {
    const totalPages = Math.ceil(total / params.limit);
    return {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPreviousPage: params.page > 1,
    };
  }

  protected buildSkip(params: PaginationParams): number {
    return (params.page - 1) * params.limit;
  }
}
