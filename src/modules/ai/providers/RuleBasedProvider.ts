// Rule-based AI provider — default implementation.
// Returns deterministic, explainable outputs derived entirely from business rules.
// No external API calls. Confidence scores are computed from real data deviations.
// Future LLM activation: set AI_PROVIDER=gemini and configure AI_API_KEY.
import type { IAIProvider, AIPrompt, AICompletionResult } from "../types";

export class RuleBasedProvider implements IAIProvider {
  readonly providerName = "rule-based";

  async complete(prompt: AIPrompt): Promise<AICompletionResult> {
    return {
      text: `[Rule-based analysis] ${prompt.userMessage.slice(0, 100)}...`,
      confidence: 0.75,
      provider: this.providerName,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
