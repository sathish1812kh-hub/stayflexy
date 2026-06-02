// LLM provider stub — ready to activate when an LLM API key is configured.
// Switch the active provider in AIProviderRegistry by setting AI_PROVIDER=gemini.
// Install: npm install @google/generative-ai
import type { IAIProvider, AIPrompt, AICompletionResult } from "../types";

export class LLMProvider implements IAIProvider {
  readonly providerName: string;

  constructor(providerName = "llm") {
    this.providerName = providerName;
  }

  async complete(_prompt: AIPrompt): Promise<AICompletionResult> {
    const apiKey = process.env["AI_API_KEY"];
    if (!apiKey) {
      throw new Error(`LLM provider requires AI_API_KEY environment variable`);
    }

    // Production: wire actual SDK call here.
    // Example (Google Gemini):
    // const { GoogleGenerativeAI } = await import("@google/generative-ai");
    // const genAI = new GoogleGenerativeAI(apiKey);
    // const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", systemInstruction: prompt.systemContext });
    // const msg = await model.generateContent(prompt.userMessage);
    // return { text: msg.response.text(), confidence: 0.85, provider: this.providerName };

    throw new Error("LLM provider not yet configured. Set AI_PROVIDER=rule-based or configure LLM SDK.");
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env["AI_API_KEY"]);
  }
}
