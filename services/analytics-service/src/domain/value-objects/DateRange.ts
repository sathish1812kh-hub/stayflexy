import { BadRequestError } from '@stayflexi/shared-errors'

export class DateRange {
  readonly from: Date
  readonly to: Date

  constructor(from: string, to: string) {
    const f = new Date(from)
    const t = new Date(to)
    if (isNaN(f.getTime()) || isNaN(t.getTime())) {
      throw new BadRequestError('Invalid date format. Use YYYY-MM-DD')
    }
    if (f > t) {
      throw new BadRequestError('dateFrom must be before dateTo')
    }
    const maxDays = 366
    if ((t.getTime() - f.getTime()) / 86400000 > maxDays) {
      throw new BadRequestError(`Date range cannot exceed ${maxDays} days`)
    }
    this.from = f
    this.to = t
  }

  get fromISO(): string { return this.from.toISOString().split('T')[0] ?? '' }
  get toISO(): string { return this.to.toISOString().split('T')[0] ?? '' }
  get dayCount(): number { return Math.ceil((this.to.getTime() - this.from.getTime()) / 86400000) + 1 }
}
