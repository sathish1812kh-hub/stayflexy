import { logger } from "@utils/logger";
import { AppError } from "@errors/AppError";
import { InternalServerError } from "@errors/HttpError";
import type { PaginatedResult, PaginationParams } from "@shared-types";

type ChildLogger = ReturnType<typeof logger.child>;

export abstract class BaseService {
  protected abstract readonly moduleName: string;
  protected log!: ChildLogger;

  protected getLogger(): ChildLogger {
    if (!this.log) {
      this.log = logger.child(this.moduleName);
    }
    return this.log;
  }

  protected async execute<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const log = this.getLogger();
    log.debug(`Executing: ${operation}`);
    try {
      const result = await fn();
      log.debug(`Completed: ${operation}`);
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      log.error(`Failed: ${operation}`, error instanceof Error ? error : undefined);
      throw new InternalServerError(`${this.moduleName}.${operation} failed`);
    }
  }

  protected buildPaginationParams(page = 1, limit = 20): PaginationParams {
    return {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
    };
  }

  protected emptyPaginatedResult<T>(params: PaginationParams): PaginatedResult<T> {
    return {
      data: [],
      meta: {
        page: params.page,
        limit: params.limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }
}
