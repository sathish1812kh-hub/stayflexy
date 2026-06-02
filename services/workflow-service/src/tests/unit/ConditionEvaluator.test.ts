import { ConditionEvaluator } from '../../engines/ConditionEvaluator'
import type { Condition } from '../../engines/ConditionEvaluator'

describe('ConditionEvaluator', () => {
  let evaluator: ConditionEvaluator

  beforeEach(() => {
    evaluator = new ConditionEvaluator()
  })

  it('eq operator: matches exact value', () => {
    const conditions: Condition[] = [{ field: 'status', operator: 'eq', value: 'ACTIVE' }]
    const context = { status: 'ACTIVE' }
    expect(evaluator.evaluate(conditions, context)).toBe(true)
  })

  it('ne operator: does not match different value', () => {
    const conditions: Condition[] = [{ field: 'status', operator: 'ne', value: 'INACTIVE' }]
    const context = { status: 'ACTIVE' }
    expect(evaluator.evaluate(conditions, context)).toBe(true)
  })

  it('gt/lt numeric comparisons work', () => {
    const gtConditions: Condition[] = [{ field: 'count', operator: 'gt', value: 5 }]
    const ltConditions: Condition[] = [{ field: 'count', operator: 'lt', value: 10 }]
    const context = { count: 7 }
    expect(evaluator.evaluate(gtConditions, context)).toBe(true)
    expect(evaluator.evaluate(ltConditions, context)).toBe(true)

    const failGt: Condition[] = [{ field: 'count', operator: 'gt', value: 10 }]
    expect(evaluator.evaluate(failGt, context)).toBe(false)
  })

  it('contains: string includes substring', () => {
    const conditions: Condition[] = [
      { field: 'message', operator: 'contains', value: 'hello' },
    ]
    const context = { message: 'say hello world' }
    expect(evaluator.evaluate(conditions, context)).toBe(true)

    const missingContext = { message: 'goodbye world' }
    expect(evaluator.evaluate(conditions, missingContext)).toBe(false)
  })

  it('empty conditions array always returns true', () => {
    const conditions: Condition[] = []
    const context = { anything: 'value' }
    expect(evaluator.evaluate(conditions, context)).toBe(true)
  })
})
