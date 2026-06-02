import { GetWorkflow } from '../../application/use-cases/GetWorkflow'
import { RetryWorkflow } from '../../application/use-cases/RetryWorkflow'
import { ConditionEvaluator } from '../../engines/ConditionEvaluator'
import type { IWorkflowExecutionRepository } from '../../domain/repositories/IWorkflowExecutionRepository'
import type { WorkflowCache } from '../../infrastructure/cache/WorkflowCache'
import type { WorkflowEngine } from '../../engines/WorkflowEngine'
import type { Logger } from '@stayflexi/shared-logger'
import { WorkflowExecution } from '../../domain/entities/WorkflowExecution'
import type { WorkflowExecutionProps } from '../../domain/entities/WorkflowExecution'
import { ForbiddenError, NotFoundError, BadRequestError } from '@stayflexi/shared-errors'

function makeExecution(overrides?: Partial<WorkflowExecutionProps>): WorkflowExecution {
  return new WorkflowExecution({
    id: 'exec-1',
    workflowName: 'booking-confirmation',
    automationRuleId: 'rule-1',
    executionStatus: 'FAILED',
    triggerSource: 'booking.created',
    executionPayload: { bookingId: 'bk-1' },
    resultPayload: null,
    retryCount: 0,
    idempotencyKey: 'idem-1',
    startedAt: new Date(),
    completedAt: null,
    failureReason: 'SMTP timeout',
    organizationId: 'org-1',
    hotelId: 'hotel-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })
}

function makeRepo(): jest.Mocked<IWorkflowExecutionRepository> {
  return {
    findById: jest.fn(),
    findByOrganization: jest.fn(),
    findFailedForRetry: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    incrementRetry: jest.fn(),
  } as unknown as jest.Mocked<IWorkflowExecutionRepository>
}

function makeCache(): jest.Mocked<WorkflowCache> {
  return {
    getExecution: jest.fn().mockResolvedValue(null),
    setExecution: jest.fn().mockResolvedValue(undefined),
    invalidateExecution: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<WorkflowCache>
}

function makeEngine(): jest.Mocked<WorkflowEngine> {
  return {
    trigger: jest.fn().mockResolvedValue('exec-new'),
    triggerByEvent: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<WorkflowEngine>
}

function makeLogger(): Logger {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as Logger
}

// ─── GetWorkflow — tenant isolation ──────────────────────────────────────────

describe('GetWorkflow — tenant isolation', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns execution when organizationId matches', async () => {
    const repo = makeRepo()
    repo.findById.mockResolvedValue(makeExecution())
    const uc = new GetWorkflow(repo, makeCache())

    const result = await uc.execute('exec-1', 'org-1')
    expect(result.id).toBe('exec-1')
  })

  it('throws ForbiddenError when organizationId does not match', async () => {
    const repo = makeRepo()
    repo.findById.mockResolvedValue(makeExecution({ organizationId: 'org-1' }))
    const uc = new GetWorkflow(repo, makeCache())

    await expect(uc.execute('exec-1', 'org-EVIL')).rejects.toThrow(ForbiddenError)
  })

  it('throws NotFoundError when execution does not exist', async () => {
    const repo = makeRepo()
    repo.findById.mockResolvedValue(null)
    const uc = new GetWorkflow(repo, makeCache())

    await expect(uc.execute('exec-missing', 'org-1')).rejects.toThrow(NotFoundError)
  })

  it('returns cached execution without hitting the database', async () => {
    const repo = makeRepo()
    const cache = makeCache()
    cache.getExecution.mockResolvedValue(makeExecution())
    const uc = new GetWorkflow(repo, cache)

    const result = await uc.execute('exec-1', 'org-1')
    expect(result.id).toBe('exec-1')
    expect(repo.findById).not.toHaveBeenCalled()
  })
})

// ─── RetryWorkflow — tenant isolation & retry limits ─────────────────────────

describe('RetryWorkflow — tenant isolation', () => {
  afterEach(() => jest.clearAllMocks())

  it('throws ForbiddenError when retrying an execution from another org', async () => {
    const repo = makeRepo()
    repo.findById.mockResolvedValue(makeExecution({ organizationId: 'org-1' }))
    const uc = new RetryWorkflow(repo, makeEngine(), makeLogger())

    await expect(uc.execute('exec-1', 'org-EVIL')).rejects.toThrow(ForbiddenError)
    expect(repo.incrementRetry).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when execution does not exist', async () => {
    const repo = makeRepo()
    repo.findById.mockResolvedValue(null)
    const uc = new RetryWorkflow(repo, makeEngine(), makeLogger())

    await expect(uc.execute('exec-missing', 'org-1')).rejects.toThrow(NotFoundError)
  })

  it('throws BadRequestError when execution status is COMPLETED', async () => {
    const repo = makeRepo()
    repo.findById.mockResolvedValue(makeExecution({ executionStatus: 'COMPLETED', retryCount: 0 }))
    const uc = new RetryWorkflow(repo, makeEngine(), makeLogger())

    await expect(uc.execute('exec-1', 'org-1')).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError when retryCount is at max (3)', async () => {
    const repo = makeRepo()
    repo.findById.mockResolvedValue(makeExecution({ executionStatus: 'FAILED', retryCount: 3 }))
    const uc = new RetryWorkflow(repo, makeEngine(), makeLogger())

    await expect(uc.execute('exec-1', 'org-1')).rejects.toThrow(BadRequestError)
  })

  it('triggers a new execution and returns both IDs on success', async () => {
    const repo = makeRepo()
    repo.findById.mockResolvedValue(makeExecution({ executionStatus: 'FAILED', retryCount: 1 }))
    repo.incrementRetry.mockResolvedValue(undefined)
    const engine = makeEngine()
    engine.trigger.mockResolvedValue('exec-new-123')
    const uc = new RetryWorkflow(repo, engine, makeLogger())

    const result = await uc.execute('exec-1', 'org-1')
    expect(result.executionId).toBe('exec-1')
    expect(result.newExecutionId).toBe('exec-new-123')
    expect(repo.incrementRetry).toHaveBeenCalledWith('exec-1')
  })
})

// ─── ConditionEvaluator — edge cases ─────────────────────────────────────────

describe('ConditionEvaluator — edge cases', () => {
  const evaluator = new ConditionEvaluator()

  it('returns true for empty conditions (vacuous truth)', () => {
    expect(evaluator.evaluate([], { bookingId: 'b1' })).toBe(true)
  })

  it('eq: matches exact string value', () => {
    expect(evaluator.evaluate([{ field: 'status', operator: 'eq', value: 'CONFIRMED' }], { status: 'CONFIRMED' })).toBe(true)
    expect(evaluator.evaluate([{ field: 'status', operator: 'eq', value: 'CANCELLED' }], { status: 'CONFIRMED' })).toBe(false)
  })

  it('ne: returns true when values differ', () => {
    expect(evaluator.evaluate([{ field: 'status', operator: 'ne', value: 'CANCELLED' }], { status: 'CONFIRMED' })).toBe(true)
  })

  it('gt/lt/gte/lte: numeric comparisons', () => {
    const ctx = { occupancy: 85 }
    expect(evaluator.evaluate([{ field: 'occupancy', operator: 'gt', value: 80 }], ctx)).toBe(true)
    expect(evaluator.evaluate([{ field: 'occupancy', operator: 'gt', value: 90 }], ctx)).toBe(false)
    expect(evaluator.evaluate([{ field: 'occupancy', operator: 'lt', value: 90 }], ctx)).toBe(true)
    expect(evaluator.evaluate([{ field: 'occupancy', operator: 'gte', value: 85 }], ctx)).toBe(true)
    expect(evaluator.evaluate([{ field: 'occupancy', operator: 'lte', value: 85 }], ctx)).toBe(true)
    expect(evaluator.evaluate([{ field: 'occupancy', operator: 'lte', value: 84 }], ctx)).toBe(false)
  })

  it('gt returns false when field is not a number', () => {
    expect(evaluator.evaluate([{ field: 'status', operator: 'gt', value: 50 }], { status: 'CONFIRMED' })).toBe(false)
  })

  it('contains: substring match', () => {
    expect(evaluator.evaluate([{ field: 'notes', operator: 'contains', value: 'VIP' }], { notes: 'This is a VIP guest' })).toBe(true)
    expect(evaluator.evaluate([{ field: 'notes', operator: 'contains', value: 'VIP' }], { notes: 'Regular guest' })).toBe(false)
  })

  it('exists: true when field is present and non-null', () => {
    expect(evaluator.evaluate([{ field: 'bookingId', operator: 'exists' }], { bookingId: 'b1' })).toBe(true)
    expect(evaluator.evaluate([{ field: 'bookingId', operator: 'exists' }], { bookingId: null })).toBe(false)
    expect(evaluator.evaluate([{ field: 'bookingId', operator: 'exists' }], {})).toBe(false)
  })

  it('nested field access with dot notation', () => {
    const ctx = { booking: { guest: { email: 'guest@hotel.com' } } }
    expect(evaluator.evaluate([{ field: 'booking.guest.email', operator: 'eq', value: 'guest@hotel.com' }], ctx)).toBe(true)
    expect(evaluator.evaluate([{ field: 'booking.guest.email', operator: 'eq', value: 'other@hotel.com' }], ctx)).toBe(false)
  })

  it('returns false for missing nested field', () => {
    const ctx = { booking: {} }
    expect(evaluator.evaluate([{ field: 'booking.guest.email', operator: 'exists' }], ctx)).toBe(false)
  })

  it('all conditions must pass (AND logic)', () => {
    const ctx = { status: 'CONFIRMED', amount: 500 }
    expect(evaluator.evaluate([
      { field: 'status', operator: 'eq', value: 'CONFIRMED' },
      { field: 'amount', operator: 'gt', value: 300 },
    ], ctx)).toBe(true)

    expect(evaluator.evaluate([
      { field: 'status', operator: 'eq', value: 'CONFIRMED' },
      { field: 'amount', operator: 'gt', value: 600 },
    ], ctx)).toBe(false)
  })

  it('returns false for unknown operator', () => {
    expect(evaluator.evaluate([{ field: 'status', operator: 'unknown' as never, value: 'x' }], { status: 'x' })).toBe(false)
  })
})
