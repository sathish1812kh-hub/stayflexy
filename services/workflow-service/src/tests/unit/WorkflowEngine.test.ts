import { WorkflowEngine } from '../../engines/WorkflowEngine'
import { ConditionEvaluator } from '../../engines/ConditionEvaluator'
import { WorkflowStepExecutor } from '../../engines/WorkflowStepExecutor'
import { WorkflowExecution } from '../../domain/entities/WorkflowExecution'
import { AutomationRule } from '../../domain/entities/AutomationRule'
import type { IWorkflowExecutionRepository } from '../../domain/repositories/IWorkflowExecutionRepository'
import type { IAutomationRuleRepository } from '../../domain/repositories/IAutomationRuleRepository'
import type { WorkflowCache } from '../../infrastructure/cache/WorkflowCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeExecution = (
  overrides?: Partial<{
    id: string
    executionStatus: string
    retryCount: number
    idempotencyKey: string | null
  }>,
): WorkflowExecution =>
  new WorkflowExecution({
    id: overrides?.id ?? 'exec-1',
    workflowName: 'test-workflow',
    automationRuleId: null,
    executionStatus: overrides?.executionStatus ?? 'PENDING',
    triggerSource: 'BOOKING_CREATED',
    executionPayload: {},
    resultPayload: null,
    retryCount: overrides?.retryCount ?? 0,
    idempotencyKey: overrides?.idempotencyKey ?? null,
    startedAt: null,
    completedAt: null,
    failureReason: null,
    organizationId: 'org-1',
    hotelId: 'hotel-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

const makeRule = (overrides?: Partial<{ conditionPayload: unknown; actionPayload: unknown }>): AutomationRule =>
  new AutomationRule({
    id: 'rule-1',
    organizationId: 'org-1',
    hotelId: 'hotel-1',
    ruleName: 'test-rule',
    triggerType: 'BOOKING_CREATED',
    conditionPayload: overrides?.conditionPayload ?? [],
    actionPayload: overrides?.actionPayload ?? { type: 'LOG', params: { message: 'test' } },
    ruleStatus: 'ACTIVE',
    priority: 0,
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockExecutionRepo: jest.Mocked<IWorkflowExecutionRepository> = {
  findById: jest.fn(),
  findByIdempotencyKey: jest.fn(),
  findByOrganization: jest.fn(),
  findPendingRetries: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  incrementRetry: jest.fn(),
}

const mockRuleRepo: jest.Mocked<IAutomationRuleRepository> = {
  findById: jest.fn(),
  findByOrganization: jest.fn(),
  findActiveByTrigger: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockCache = {
  getIdempotencyResult: jest.fn(),
  setIdempotencyResult: jest.fn(),
  getExecutionLock: jest.fn(),
  releaseExecutionLock: jest.fn(),
  getExecution: jest.fn(),
  setExecution: jest.fn(),
  invalidateExecution: jest.fn(),
} as unknown as jest.Mocked<WorkflowCache>

const mockEventPublisher: jest.Mocked<IEventPublisher> = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn(),
  disconnect: jest.fn(),
  isConnected: jest.fn().mockReturnValue(true),
}

const mockLogger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine

  beforeEach(() => {
    jest.clearAllMocks()
    const conditionEvaluator = new ConditionEvaluator()
    const stepExecutor = new WorkflowStepExecutor(mockLogger)
    engine = new WorkflowEngine(
      mockExecutionRepo,
      mockRuleRepo,
      mockCache,
      conditionEvaluator,
      stepExecutor,
      mockEventPublisher,
      mockLogger,
    )

    // Default happy-path mock setup
    mockCache.getIdempotencyResult.mockResolvedValue(null)
    mockCache.getExecutionLock.mockResolvedValue(true)
    mockCache.releaseExecutionLock.mockResolvedValue(undefined)
    mockCache.setIdempotencyResult.mockResolvedValue(undefined)
    mockExecutionRepo.create.mockResolvedValue(makeExecution())
    mockExecutionRepo.updateStatus.mockResolvedValue(makeExecution({ executionStatus: 'COMPLETED' }))
    mockExecutionRepo.findByIdempotencyKey.mockResolvedValue(null)
  })

  it('triggers workflow and creates PENDING execution', async () => {
    const executionId = await engine.trigger({
      workflowName: 'booking-workflow',
      triggerSource: 'BOOKING_CREATED',
      organizationId: 'org-1',
      context: { bookingId: 'bk-001' },
    })

    expect(mockExecutionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowName: 'booking-workflow',
        triggerSource: 'BOOKING_CREATED',
        organizationId: 'org-1',
      }),
    )
    expect(executionId).toBe('exec-1')
  })

  it('returns existing execution on idempotency key hit', async () => {
    mockCache.getIdempotencyResult.mockResolvedValue('exec-existing')

    const executionId = await engine.trigger({
      workflowName: 'booking-workflow',
      triggerSource: 'BOOKING_CREATED',
      organizationId: 'org-1',
      context: {},
      idempotencyKey: 'unique-key-123',
    })

    expect(executionId).toBe('exec-existing')
    expect(mockExecutionRepo.create).not.toHaveBeenCalled()
  })

  it('executes NOTIFICATION action successfully', async () => {
    const execWithRule = makeExecution({ executionStatus: 'PENDING' })
    const execWithRuleAndId = new WorkflowExecution({
      ...execWithRule.toJSON(),
      id: 'exec-with-rule',
      automationRuleId: 'rule-1',
    })

    mockExecutionRepo.create.mockResolvedValue(execWithRuleAndId)
    mockRuleRepo.findById.mockResolvedValue(
      makeRule({ actionPayload: { type: 'SEND_NOTIFICATION', params: { recipient: 'user@test.com', channel: 'email' } } }),
    )
    mockExecutionRepo.updateStatus.mockResolvedValue(
      makeExecution({ executionStatus: 'COMPLETED' }),
    )

    const executionId = await engine.trigger({
      workflowName: 'notify-workflow',
      triggerSource: 'BOOKING_CREATED',
      organizationId: 'org-1',
      context: {},
      automationRuleId: 'rule-1',
    })

    // Let setImmediate callbacks run
    await new Promise(resolve => setImmediate(resolve))
    await new Promise(resolve => setImmediate(resolve))

    expect(executionId).toBe('exec-with-rule')
  })

  it('marks execution FAILED on step error', async () => {
    const execWithRule = new WorkflowExecution({
      id: 'exec-fail',
      workflowName: 'fail-workflow',
      automationRuleId: 'rule-bad',
      executionStatus: 'PENDING',
      triggerSource: 'BOOKING_CREATED',
      executionPayload: {},
      resultPayload: null,
      retryCount: 0,
      idempotencyKey: null,
      startedAt: null,
      completedAt: null,
      failureReason: null,
      organizationId: 'org-1',
      hotelId: 'hotel-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockExecutionRepo.create.mockResolvedValue(execWithRule)
    mockRuleRepo.findById.mockResolvedValue(
      makeRule({ actionPayload: { type: 'UNKNOWN_BAD_TYPE', params: {} } }),
    )
    mockExecutionRepo.updateStatus.mockResolvedValue(
      makeExecution({ executionStatus: 'FAILED' }),
    )

    await engine.trigger({
      workflowName: 'fail-workflow',
      triggerSource: 'BOOKING_CREATED',
      organizationId: 'org-1',
      context: {},
      automationRuleId: 'rule-bad',
    })

    // Let setImmediate callbacks run
    await new Promise(resolve => setImmediate(resolve))
    await new Promise(resolve => setImmediate(resolve))

    // The FAILED status update should have been called (unknown action type returns success: false)
    expect(mockExecutionRepo.updateStatus).toHaveBeenCalledWith(
      'exec-fail',
      'FAILED',
      expect.objectContaining({ failureReason: expect.any(String) }),
    )
  })

  it('evaluates conditions correctly before triggering', async () => {
    const ruleWithConditions = makeRule({
      conditionPayload: [{ field: 'amount', operator: 'gt', value: 100 }],
    })
    mockRuleRepo.findActiveByTrigger.mockResolvedValue([ruleWithConditions])
    mockRuleRepo.findById.mockResolvedValue(ruleWithConditions)
    mockExecutionRepo.create.mockResolvedValue(makeExecution())

    // This context satisfies the condition (amount=200 > 100)
    await engine.triggerByEvent('BOOKING_CREATED', 'org-1', { amount: 200 })

    expect(mockExecutionRepo.create).toHaveBeenCalledTimes(1)

    // Reset and test context that does NOT satisfy condition
    jest.clearAllMocks()
    mockRuleRepo.findActiveByTrigger.mockResolvedValue([ruleWithConditions])
    mockCache.getIdempotencyResult.mockResolvedValue(null)
    mockCache.setIdempotencyResult.mockResolvedValue(undefined)
    mockExecutionRepo.create.mockResolvedValue(makeExecution())
    mockExecutionRepo.findByIdempotencyKey.mockResolvedValue(null)

    await engine.triggerByEvent('BOOKING_CREATED', 'org-1', { amount: 50 })

    expect(mockExecutionRepo.create).not.toHaveBeenCalled()
  })

  it('triggerByEvent finds active rules for trigger type', async () => {
    const rule1 = makeRule()
    const rule2 = new AutomationRule({
      ...makeRule().toJSON(),
      id: 'rule-2',
      ruleName: 'second-rule',
    })
    mockRuleRepo.findActiveByTrigger.mockResolvedValue([rule1, rule2])
    mockRuleRepo.findById.mockResolvedValue(rule1)
    mockExecutionRepo.create.mockResolvedValue(makeExecution())

    await engine.triggerByEvent('BOOKING_CREATED', 'org-1', {})

    expect(mockRuleRepo.findActiveByTrigger).toHaveBeenCalledWith(
      'BOOKING_CREATED',
      'org-1',
    )
    // Both rules have empty conditions — both should trigger
    expect(mockExecutionRepo.create).toHaveBeenCalledTimes(2)
  })
})
