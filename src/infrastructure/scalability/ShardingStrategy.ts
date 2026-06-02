// Consistent hashing preparation for horizontal scaling.
// Used to determine which shard (DB read replica, queue partition, cache node)
// a given tenant/entity should route to.

export interface ShardConfig {
  shardCount: number;
  replicationFactor: number;
}

export class ConsistentHashRing {
  private readonly ring: Map<number, string> = new Map();
  private readonly virtualNodes: number;
  private readonly shards: string[];

  constructor(shards: string[], virtualNodes = 150) {
    this.shards = shards;
    this.virtualNodes = virtualNodes;
    this.build();
  }

  private hash(key: string): number {
    let hash = 5381;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) + hash + (key.charCodeAt(i))) >>> 0;
    }
    return hash;
  }

  private build(): void {
    for (const shard of this.shards) {
      for (let i = 0; i < this.virtualNodes; i++) {
        const virtualKey = `${shard}:vn${i}`;
        const position = this.hash(virtualKey);
        this.ring.set(position, shard);
      }
    }
  }

  // Returns the shard responsible for a given key
  getShard(key: string): string {
    if (this.ring.size === 0) return this.shards[0] ?? "default";

    const keyHash = this.hash(key);
    const positions = Array.from(this.ring.keys()).sort((a, b) => a - b);

    for (const pos of positions) {
      if (keyHash <= pos) {
        return this.ring.get(pos) ?? this.shards[0] ?? "default";
      }
    }

    // Wrap around — return first shard
    const firstPos = positions[0];
    return (firstPos !== undefined ? this.ring.get(firstPos) : null) ?? this.shards[0] ?? "default";
  }

  // Returns the tenant's shard key for routing
  static tenantShard(orgId: string, shardCount: number): number {
    let hash = 0;
    for (let i = 0; i < orgId.length; i++) {
      hash = ((hash << 5) - hash + orgId.charCodeAt(i)) >>> 0;
    }
    return hash % shardCount;
  }
}
