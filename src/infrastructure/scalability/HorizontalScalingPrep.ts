// Utilities for horizontal scaling readiness.
// These interfaces document the contracts that need to be fulfilled when
// extracting services into separate deployable units.

export interface ServiceNode {
  id: string;
  host: string;
  port: number;
  weight: number;
  healthy: boolean;
  lastCheckedAt: Date;
}

export interface LoadBalancingStrategy {
  // Returns the next node to route a request to
  selectNode(nodes: ServiceNode[], requestKey?: string): ServiceNode | null;
}

// Round-robin load balancing
export class RoundRobinStrategy implements LoadBalancingStrategy {
  private counter = 0;

  selectNode(nodes: ServiceNode[]): ServiceNode | null {
    const healthy = nodes.filter((n) => n.healthy);
    if (healthy.length === 0) return null;
    const node = healthy[this.counter % healthy.length] ?? null;
    this.counter++;
    return node;
  }
}

// Least-connections (preparation — counter tracked externally in production)
export class WeightedStrategy implements LoadBalancingStrategy {
  selectNode(nodes: ServiceNode[]): ServiceNode | null {
    const healthy = nodes.filter((n) => n.healthy);
    if (healthy.length === 0) return null;
    return healthy.reduce((best, curr) => (curr.weight > best.weight ? curr : best));
  }
}

// Environment helpers for multi-instance awareness
export const scalingUtils = {
  // Detect if running in a multi-instance environment
  isDistributed(): boolean {
    return process.env["INSTANCE_COUNT"] !== undefined && parseInt(process.env["INSTANCE_COUNT"], 10) > 1;
  },

  // Current instance identifier for distributed lock ownership
  instanceId(): string {
    return process.env["INSTANCE_ID"] ?? `instance-${process.pid}`;
  },

  // Number of CPU workers for horizontal parallelism
  workerConcurrency(): number {
    const cores = parseInt(process.env["WORKER_CONCURRENCY"] ?? "1", 10);
    return isNaN(cores) ? 1 : cores;
  },
};
