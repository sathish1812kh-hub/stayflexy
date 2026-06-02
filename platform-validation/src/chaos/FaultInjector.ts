export interface FaultConfig {
  errorRate: number // 0.0–1.0
  latencyMs?: number
  errorMessage?: string
}

export class FaultInjector {
  private faults = new Map<string, FaultConfig>()

  injectFault(resource: string, config: FaultConfig): void {
    this.faults.set(resource, config)
  }

  removeFault(resource: string): void {
    this.faults.delete(resource)
  }

  clearAll(): void {
    this.faults.clear()
  }

  async executeWithFault<T>(resource: string, fn: () => Promise<T>): Promise<T> {
    const fault = this.faults.get(resource)
    if (!fault) return fn()

    if (fault.latencyMs && fault.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, fault.latencyMs))
    }

    if (Math.random() < fault.errorRate) {
      throw new Error(fault.errorMessage ?? `Injected fault for resource: ${resource}`)
    }

    return fn()
  }

  hasFault(resource: string): boolean {
    return this.faults.has(resource)
  }
}
