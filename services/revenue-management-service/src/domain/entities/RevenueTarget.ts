export interface RevenueTargetProps {
  id: string
  organizationId: string
  hotelId: string
  targetPeriod: string          // YYYY-MM
  targetRevenue: number
  targetRevPar: number
  targetAdr: number
  targetOccupancy: number       // 0.0–1.0
  actualRevenue: number | null
  actualRevPar: number | null
  actualAdr: number | null
  actualOccupancy: number | null
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export class RevenueTarget {
  constructor(private readonly props: RevenueTargetProps) {}

  get id() { return this.props.id }
  get organizationId() { return this.props.organizationId }
  get hotelId() { return this.props.hotelId }
  get targetPeriod() { return this.props.targetPeriod }
  get targetRevenue() { return this.props.targetRevenue }
  get targetRevPar() { return this.props.targetRevPar }
  get targetAdr() { return this.props.targetAdr }
  get targetOccupancy() { return this.props.targetOccupancy }
  get actualRevenue() { return this.props.actualRevenue }

  get revenueAchievementPercent(): number | null {
    if (!this.props.actualRevenue) return null
    return (this.props.actualRevenue / this.props.targetRevenue) * 100
  }

  get revParAchievementPercent(): number | null {
    if (!this.props.actualRevPar) return null
    return (this.props.actualRevPar / this.props.targetRevPar) * 100
  }

  get isOnTrack(): boolean {
    const achievement = this.revenueAchievementPercent
    return achievement !== null && achievement >= 90
  }

  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }

  toJSON(): RevenueTargetProps { return { ...this.props } }
}
