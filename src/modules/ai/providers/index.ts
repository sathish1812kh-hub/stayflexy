export { RuleBasedProvider } from "./RuleBasedProvider";
export { LLMProvider } from "./LLMProvider";

import { RuleBasedProvider } from "./RuleBasedProvider";
import { LLMProvider } from "./LLMProvider";
import type { IAIProvider } from "../types";

// Registry: select active provider from environment config.
// AI_PROVIDER=gemini activates LLM; anything else → rule-based (default).
export function getActiveProvider(): IAIProvider {
  const configured = process.env["AI_PROVIDER"] ?? "rule-based";
  if (configured === "rule-based") return new RuleBasedProvider();
  return new LLMProvider(configured);
}
