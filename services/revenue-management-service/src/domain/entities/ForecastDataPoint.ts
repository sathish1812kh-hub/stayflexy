export type ForecastConfidence = 'LOW' | 'MEDIUM' | 'HIGH'

export interface ForecastDataPointProps {
  id: string
  organizationId: string
  hotelId: string
  forecastDate: string          // YYYY-MM-DD
  projectedOccupancy: number    // 0.0–1.0
  projectedAdr: number
  projectedRevPar: number
  confidence: ForecastConfidence
  bookingVelocity: number | null
  competitorRateIndex: number | null
  eventImpact: unknown | null
  forecastedBy: string
  createdAt: Date
  updatedAt: Date
}

export class ForecastDataPoint {
  constructor(private readonly props: ForecastDataPointProps) {}

  get id() { return this.props.id }
  get organizationId() { return this.props.organizationId }
  get hotelId() { return this.props.hotelId }
  get forecastDate() { return this.props.forecastDate }
  get projectedOccupancy() { return this.props.projectedOccupancy }
  get projectedAdr() { return this.props.projectedAdr }
  get projectedRevPar() { return this.props.projectedRevPar }
  get confidence() { return this.props.confidence }
  get bookingVelocity() { return this.props.bookingVelocity }
  get eventImpact() { return this.props.eventImpact }

  get demandFactor(): number {
    if (this.props.projectedOccupancy >= 0.90) return 1.30
    if (this.props.projectedOccupancy >= 0.75) return 1.15
    if (this.props.projectedOccupancy >= 0.50) return 1.00
    if (this.props.projectedOccupancy <= 0.30) return 0.90
    return 1.00
  }

  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }

  toJSON(): ForecastDataPointProps { return { ...this.props } }
}
