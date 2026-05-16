import { createAgentSession } from "@earendil-works/pi-coding-agent";
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import type { Model } from "@earendil-works/pi-ai";
import { createModel } from "./model.js";

/**
 * A named, purposeful agent in the Aiku pipeline.
 *
 * Each agent is an isolated LLM session with a distinct role.
 * Agent context never leaks across roles — this is enforced by
 * giving each agent its own session.
 */
export interface Agent {
  /** Human-readable name for logging and debugging */
  readonly name: string;
  /** What this agent is responsible for */
  readonly purpose: string;
  /** The underlying isolated LLM session */
  readonly session: AgentSession;
}

/**
 * The four agents that collaborate to create a haiku entry.
 *
 * - **Curator** — Picks the evocative word that anchors the entry
 * - **Poet** — Composes the 5-7-5 haiku connecting the word to AI
 * - **Designer** — Chooses the color palette, font, and signature
 * - **Critic** — Validates the candidate against existing entries
 */
export interface AikuAgents {
  readonly curator: Agent;
  readonly poet: Agent;
  readonly designer: Agent;
  readonly critic: Agent;
}

interface AgentRole {
  name: string;
  purpose: string;
}

const ROLES: readonly AgentRole[] = [
  {
    name: "Curator",
    purpose: "Picks a single evocative English word that inspires a striking visual palette",
  },
  {
    name: "Poet",
    purpose: "Composes a 5-7-5 haiku connecting the word to artificial intelligence through surprising metaphor",
  },
  {
    name: "Designer",
    purpose: "Creates a visual treatment — colors, font, text color, and an eerie signature",
  },
  {
    name: "Critic",
    purpose: "Validates the candidate entry against existing entries to prevent duplication",
  },
] as const;

/**
 * Creates all four agents for a pipeline run.
 * Each agent gets its own isolated session to prevent context leakage.
 */
export async function createAgents(): Promise<AikuAgents> {
  const model = createModel();

  const create = async (role: AgentRole): Promise<Agent> => {
    const { session } = await createAgentSession({ model });
    return { name: role.name, purpose: role.purpose, session };
  };

  const [curator, poet, designer, critic] = await Promise.all(
    ROLES.map(role => create(role)),
  );

  return { curator, poet, designer, critic };
}
