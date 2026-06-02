import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

interface WorkerState {
  id: string
  status: 'running' | 'crashed' | 'restarting'
  processedCount: number
  crashCount: number
}

export class WorkerCrashSimulator {
  private workers: WorkerState[] = []

  initWorkers(count: number): void {
    this.workers = Array.from({ length: count }, (_, i) => ({
      id: `worker-${i}`,
      status: 'running' as const,
      processedCount: 0,
      crashCount: 0,
    }))
  }

  simulateCrash(workerId: string): void {
    const w = this.workers.find(w => w.id === workerId)
    if (w) {
      w.status = 'crashed'
      w.crashCount++
    }
  }

  restart(workerId: string): void {
    const w = this.workers.find(w => w.id === workerId)
    if (w && w.status === 'crashed') {
      w.status = 'running'
    }
  }

  validateRecovery(workerId: string): ValidationResult {
    const start = Date.now()
    const worker = this.workers.find(w => w.id === workerId)
    if (!worker) {
      return createResult(
        'WorkerRecovery',
        false,
        `Worker ${workerId} not found`,
        [`Unknown worker: ${workerId}`],
        [],
        Date.now() - start,
      )
    }

    this.simulateCrash(workerId)
    const crashed = worker.status === 'crashed'
    this.restart(workerId)
    const recovered = worker.status === 'running'

    const passed = crashed && recovered
    return createResult(
      'WorkerCrashRecovery',
      passed,
      `Worker ${workerId}: crashed=${crashed}, recovered=${recovered}`,
      passed ? [] : ['Worker crash/recovery cycle failed'],
      [],
      Date.now() - start,
    )
  }

  getRunningWorkerCount(): number {
    return this.workers.filter(w => w.status === 'running').length
  }
}
