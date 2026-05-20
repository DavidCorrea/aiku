import type { AgentSession } from "@earendil-works/pi-coding-agent";

export abstract class BaseAgent {
  abstract readonly name: string;
  abstract readonly purpose: string;

  protected readonly session: AgentSession;

  constructor(session: AgentSession) {
    this.session = session;
  }

  protected async ask(promptText: string): Promise<string> {
    await this.session.prompt(promptText);
    const messages = this.session.state.messages;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role !== "assistant") {
      throw new Error(`[${this.name}] No assistant response found`);
    }
    return lastMessage.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map(c => c.text)
      .join("");
  }

  protected extractJSON(raw: string): unknown {
    const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      // Try quoting unquoted keys (JS object notation → JSON)
      const fixed = cleaned.replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":');
      try {
        return JSON.parse(fixed);
      } catch {
        const match = fixed.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        // Detect prose responses that contain no JSON at all
        if (!fixed.includes("{")) {
          throw new Error(`Response contains no JSON object. Got: "${raw.slice(0, 200)}"`);
        }
        throw new Error(`Could not extract JSON from: "${raw.slice(0, 200)}"`);
      }
    }
  }
}
