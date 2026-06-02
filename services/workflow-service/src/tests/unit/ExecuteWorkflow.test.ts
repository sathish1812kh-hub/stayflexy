import { ExecuteWorkflow } from '../../application/use-cases/ExecuteWorkflow'
import { RetryWorkflow } from '../../application/use-cases/RetryWorkflow'
import { ListWorkflows } from '../../application/use-cases/ListWorkflows'
import { WorkflowExecution } from '../../domain/entities/WorkflowExecution'
import type { IWorkflowExecutionRepository } from '../../domain/repositories/IWorkflowExecutionRepository'
import type { WorkflowEngine } from '../../engines/WorkflowEngine'
import { NotFoundError, BadRequestError } from '@stayflexi/shared-errors'
import type { Logger } from '@stayflexi/shared-logger'

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeExecution = (
  overrides?: Partial<{
    id: string
    executionStatus: string
    retryCount: number
    idempotencyKey: string | null
    organizationId: string
    executionPayload: unknown
  }>,
): WorkflowExecution =>
  new WorkflowExecution({
    id: overrides?.id ?? 'exec-1',
    workflowName: 'booking-workflow',
    automationRuleId: null,
    executionStatus: overrides?.executionStatus ?? 'PENDING',
    triggerSource: 'BOOKING_CREATED',
    executionPayload: overrides?.executionPayload ?? { bookingId: 'bk-001' },
    resultPayload: null,
    retryCount: overrides?.retryCount ?? 0,
    idempotencyKey: overrides?.idempotencyKey ?? null,
    startedAt: null,
    completedAt: null,
    failureReason: null,
    organizationId: overrides?.organizationId ?? 'org-1',
    hotelId: 'hotel-1',
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

const mockEngine = {
  trigger: jest.fn(),
  triggerByEvent: jest.fn(),
} as unknown as jest.Mocked<WorkflowEngine>

const mockLogger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ExecuteWorkflow', () => {
  let useCase: ExecuteWorkflow

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ExecuteWorkflow(mockEngine, mockLogger)
    mockEngine.trigger.mockResolvedValue('exec-1')
  })

  it('creates execution with PENDING status', async () => {
    const result = await useCase.execute(
      {
        workflowName: 'booking-workflow',
        triggerSource: 'BOOKING_CREATED',
        context: { bookingId: 'bk-001' },
      },
      'org-1',
      'corr-1',
    )

    expect(mockEngine.trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowName: 'booking-workflow',
        triggerSource: 'BOOKING_CREATED',
        organizationId: 'org-1',
        context: { bookingId: 'bk-001' },
      }),
    )
    expect(result.executionId).toBe('exec-1')
  })

  it('idempotency key prevents duplicate execution', async () => {
    mockEngine.trigger.mockResolvedValueOnce('exec-existing')

    const result = await useCase.execute(
      {
        workflowName: 'booking-workflow',
        triggerSource: 'BOOKING_CREATED',
        context: {},
        idempotencyKey: 'idem-key-abc',
      },
      'org-1',
    )

    expect(mockEngine.trigger).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'idem-key-abc' }),
    )
    // Engine handles deduplication and returns existing id
    expect(result.executionId).toBe('exec-existing')
  })

  it('NotFoundError when automationRule not found (when provided)', async () => {
    // Simulate engine throwing NotFoundError when the automation rule ID is invalid
    mockEngine.trigger.mockRejectedValueOnce(
      new NotFoundError('Automation rule not found: bad-rule-id'),
    )

    await expect(
      useCase.execute(
        {
          workflowName: 'test-workflow',
          triggerSource: 'MANUAL',
          context: {},
          automationRuleId: 'bad-rule-id',
        },
        'org-1',
      ),
    ).rejects.toThrow(NotFoundError)
  })
})

describe('RetryWorkflow', () => {
  let useCase: RetryWorkflow

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new RetryWorkflow(mockExecutionRepo, mockEngine, mockLogger)
    mockEngine.trigger.mockResolvedValue('new-exec-1')
    mockExecutionRepo.incrementRetry.mockResolvedValue(makeExecution({ retryCount: 1 }))
  })

  it('retry triggers engine with original context', async () => {
    const failed = makeExecution({
      executionStatus: 'FAILED',
      retryCount: 1,
      executionPayload: { bookingId: 'bk-original' },
    })
    mockExecutionRepo.findById.mockResolvedValue(failed)

    const result = await useCase.execute('exec-1', 'org-1', 'corr-1')

    expect(mockEngine.trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowName: 'booking-workflow',
        triggerSource: 'BOOKING_CREATED',
        organizationId: 'org-1',
        context: { bookingId: 'bk-original' },
      }),
    )
    expect(result.newExecutionId).toBe('new-exec-1')
  })

  it('throws BadRequestError when execution cannot be retried', async () => {
    const maxRetried = makeExecution({
      executionStatus: 'FAILED',
      retryCount: 3, // already at max
    })
    mockExecutionRepo.findById.mockResolvedValue(maxRetried)

    await expect(useCase.execute('exec-1', 'org-1')).rejects.toThrow(BadRequestError)
  })
})

describe('ListWorkflows', () => {
  let useCase: ListWorkflows

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ListWorkflows(mockExecutionRepo)
  })

  it('list returns paginated executions for organization', async () => {
    const execs = [makeExecution({ id: 'e-1' }), makeExecution({ id: 'e-2' })]
    mockExecutionRepo.findByOrganization.mockResolvedValue({
      data: execs,
      total: 2,
    })

    const result = await useCase.execute('org-1', { page: 1, limit: 20 })

    expect(mockExecutionRepo.findByOrganization).toHaveBeenCalledWith('org-1', {
      page: 1,
      limit: 20,
    })
    expect(result.data).toHaveLength(2)
    expect(result.meta.total).toBe(2)
    expect(result.meta.page).toBe(1)
  })
})
