export interface Condition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'exists'
  value?: unknown
}

export class ConditionEvaluator {
  evaluate(conditions: Condition[], context: Record<string, unknown>): boolean {
    return conditions.every(cond => this.evaluateOne(cond, context))
  }

  private evaluateOne(cond: Condition, ctx: Record<string, unknown>): boolean {
    const val = this.getField(ctx, cond.field)
    switch (cond.operator) {
      case 'eq':
        return val === cond.value
      case 'ne':
        return val !== cond.value
      case 'gt':
        return (
          typeof val === 'number' &&
          typeof cond.value === 'number' &&
          val > cond.value
        )
      case 'lt':
        return (
          typeof val === 'number' &&
          typeof cond.value === 'number' &&
          val < cond.value
        )
      case 'gte':
        return (
          typeof val === 'number' &&
          typeof cond.value === 'number' &&
          val >= cond.value
        )
      case 'lte':
        return (
          typeof val === 'number' &&
          typeof cond.value === 'number' &&
          val <= cond.value
        )
      case 'contains':
        return (
          typeof val === 'string' &&
          typeof cond.value === 'string' &&
          val.includes(cond.value)
        )
      case 'exists':
        return val !== undefined && val !== null
      default:
        return false
    }
  }

  private getField(ctx: Record<string, unknown>, field: string): unknown {
    const parts = field.split('.')
    let current: unknown = ctx
    for (const part of parts) {
      if (typeof current !== 'object' || current === null) return undefined
      current = (current as Record<string, unknown>)[part]
    }
    return current
  }
}
