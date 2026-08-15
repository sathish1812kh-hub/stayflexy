// FILE: src/modules/revenue/validators/index.ts
import { ZodError } from 'zod'
import { ValidationError } from '@errors/HttpError'
import {
  RevenueMetricFilterDto,
  OccupancyQueryDto,
  ForecastQueryDto,
  ComparisonQueryDto,
  CreateCompetitorHotelDto,
  UpdateCompetitorHotelDto,
  UploadCompetitorPricesDto,
  type RevenueMetricFilterDtoType,
  type OccupancyQueryDtoType,
  type ForecastQueryDtoType,
  type ComparisonQueryDtoType,
  type CreateCompetitorHotelDtoType,
  type UpdateCompetitorHotelDtoType,
  type UploadCompetitorPricesDtoType,
} from '../dto'

function wrapZod<T>(fn: () => T): T {
  try {
    return fn()
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      throw new ValidationError('Validation failed', details)
    }
    throw error
  }
}

export function validateRevenueMetricFilter(data: unknown): RevenueMetricFilterDtoType {
  return wrapZod(() => RevenueMetricFilterDto.parse(data)) as RevenueMetricFilterDtoType
}

export function validateOccupancyQuery(data: unknown): OccupancyQueryDtoType {
  return wrapZod(() => OccupancyQueryDto.parse(data)) as OccupancyQueryDtoType
}

export function validateForecastQuery(data: unknown): ForecastQueryDtoType {
  return wrapZod(() => ForecastQueryDto.parse(data)) as ForecastQueryDtoType
}

export function validateComparisonQuery(data: unknown): ComparisonQueryDtoType {
  return wrapZod(() => ComparisonQueryDto.parse(data)) as ComparisonQueryDtoType
}

export function validateCreateCompetitorHotel(data: unknown): CreateCompetitorHotelDtoType {
  return wrapZod(() => CreateCompetitorHotelDto.parse(data)) as CreateCompetitorHotelDtoType
}

export function validateUpdateCompetitorHotel(data: unknown): UpdateCompetitorHotelDtoType {
  return wrapZod(() => UpdateCompetitorHotelDto.parse(data)) as UpdateCompetitorHotelDtoType
}

export function validateUploadCompetitorPrices(data: unknown): UploadCompetitorPricesDtoType {
  return wrapZod(() => UploadCompetitorPricesDto.parse(data)) as UploadCompetitorPricesDtoType
}
