import type { TaxConfig } from '../entities/TaxConfig'
import type { FeeConfig } from '../entities/FeeConfig'

export interface TaxBreakdown {
  configId: string
  name: string
  type: string
  rate: number
  amount: number
}

export interface FeeBreakdown {
  configId: string
  name: string
  type: string
  rate: number
  amount: number
}

export interface CalculationResult {
  baseAmount: number
  taxTotal: number
  feeTotal: number
  grandTotal: number
  taxes: TaxBreakdown[]
  fees: FeeBreakdown[]
}

/**
 * Pure domain service for tax/fee aggregation.
 * No DB or I/O — callers supply already-filtered active configs.
 * Handles PERCENTAGE/FIXED/PER_NIGHT/PER_PERSON via entity.calculate().
 */
export class TaxCalculationService {
  calculateTax(
    baseAmount: number,
    configs: TaxConfig[],
    opts?: { nights?: number; persons?: number },
  ): { total: number; breakdown: TaxBreakdown[] } {
    const breakdown: TaxBreakdown[] = []
    let total = 0
    for (const c of configs) {
      if (!c.isActive || c.isDeleted) continue
      const amount = c.calculate(baseAmount, opts)
      // Round per-config to 2 decimals for currency correctness
      const rounded = Math.round(amount * 100) / 100
      total += rounded
      breakdown.push({
        configId: c.id,
        name: c.name,
        type: c.type,
        rate: c.rate,
        amount: rounded,
      })
    }
    total = Math.round(total * 100) / 100
    return { total, breakdown }
  }

  calculateFee(
    baseAmount: number,
    configs: FeeConfig[],
    opts?: { nights?: number; persons?: number },
  ): { total: number; breakdown: FeeBreakdown[] } {
    const breakdown: FeeBreakdown[] = []
    let total = 0
    for (const c of configs) {
      if (!c.isActive || c.isDeleted) continue
      const amount = c.calculate(baseAmount, opts)
      const rounded = Math.round(amount * 100) / 100
      total += rounded
      breakdown.push({
        configId: c.id,
        name: c.name,
        type: c.type,
        rate: c.rate,
        amount: rounded,
      })
    }
    total = Math.round(total * 100) / 100
    return { total, breakdown }
  }

  /**
   * Full calculation including taxes and fees.
   * Example: base 100, 10% tax, $5 fixed fee → 100 + 10 + 5 = 115
   */
  calculateTotal(
    baseAmount: number,
    taxConfigs: TaxConfig[],
    feeConfigs: FeeConfig[] = [],
    opts?: { nights?: number; persons?: number },
  ): CalculationResult {
    const tax = this.calculateTax(baseAmount, taxConfigs, opts)
    const fee = this.calculateFee(baseAmount, feeConfigs, opts)
    const grandTotal = Math.round((baseAmount + tax.total + fee.total) * 100) / 100
    return {
      baseAmount,
      taxTotal: tax.total,
      feeTotal: fee.total,
      grandTotal,
      taxes: tax.breakdown,
      fees: fee.breakdown,
    }
  }
}
