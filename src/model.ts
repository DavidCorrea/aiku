import type { Model } from "@earendil-works/pi-ai";

export const MODEL_ID = "openrouter/owl-alpha";

export function createModel(): Model<"openai-completions"> {
  return {
    id: MODEL_ID,
    name: "Owl Alpha",
    api: "openai-completions",
    provider: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 1048756,
    maxTokens: 262144,
  };
}
