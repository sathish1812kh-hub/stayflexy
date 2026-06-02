// AI abstraction layer types — LLM-provider-agnostic interfaces.
// The system works entirely with rule-based intelligence today.
// These interfaces define the contract future LLM providers must implement.

export interface AIPrompt {
  systemContext: string;
  userMessage: string;
  temperature?: number; // 0.0–1.0
  maxTokens?: number;
}

export interface AICompletionResult {
  text: string;
  confidence: number; // 0.0–1.0 estimated from rule-based scoring
  provider: string;   // "rule-based" | "gemini" | "gpt-4" | etc.
  tokensUsed?: number;
}

export interface IAIProvider {
  readonly providerName: string;
  complete(prompt: AIPrompt): Promise<AICompletionResult>;
  isAvailable(): Promise<boolean>;
}

export interface AIOrchestrationRequest {
  hotelId: string;
  organizationId: string;
  operation: "RECOMMENDATIONS" | "ANOMALIES" | "INSIGHTS" | "FORECAST";
  context?: Record<string, unknown>;
}

export interface AIOrchestrationResult {
  operation: string;
  hotelId: string;
  generatedAt: Date;
  results: unknown[];
  provider: string;
  processingMs: number;
}
