export interface RateRecommendationProps {
  id: string
  organizationId: string
  hotelId: string
  roomTypeId: string
  targetDate: string            // YYYY-MM-DD
  basePrice: number
  recommendedPrice: number
  minPrice: number
  maxPrice: number
  confidenceScore: number       // 0.0–1.0
  occupancyFactor: number
  seasonalFactor: number
  demandFactor: number
  rationale: string | null
  appliedAt: Date | null
  expiresAt: Date
  createdAt: Date
}

export class RateRecommendation {
  constructor(private readonly props: RateRecommendationProps) {}

  get id() { return this.props.id }
  get organizationId() { return this.props.organizationId }
  get hotelId() { return this.props.hotelId }
  get roomTypeId() { return this.props.roomTypeId }
  get targetDate() { return this.props.targetDate }
  get basePrice() { return this.props.basePrice }
  get recommendedPrice() { return this.props.recommendedPrice }
  get minPrice() { return this.props.minPrice }
  get maxPrice() { return this.props.maxPrice }
  get confidenceScore() { return this.props.confidenceScore }
  get rationale() { return this.props.rationale }
  get expiresAt() { return this.props.expiresAt }
  get appliedAt() { return this.props.appliedAt }

  get isExpired(): boolean { return new Date() > this.props.expiresAt }
  get isApplied(): boolean { return this.props.appliedAt !== null }

  get priceChangePercent(): number {
    return this.props.basePrice > 0
      ? ((this.props.recommendedPrice - this.props.basePrice) / this.props.basePrice) * 100
      : 0
  }

  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }

  toJSON(): RateRecommendationProps { return { ...this.props } }
}
