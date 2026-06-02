import type { NextRequest, NextResponse } from "next/server";

export type MiddlewareFn = (
  req: NextRequest,
  next: () => Promise<NextResponse>
) => Promise<NextResponse>;

export interface PipelineContext {
  correlationId: string;
  startedAt: number;
  organizationId?: string;
  userId?: string;
}

export interface GatewayConfig {
  enableRateLimit: boolean;
  enableCorrelationId: boolean;
  enableRequestLogging: boolean;
  enableSecurityHeaders: boolean;
  rateLimit: { windowMs: number; maxRequests: number };
}
