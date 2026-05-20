import { createAgentSession, type AgentSession } from "@earendil-works/pi-coding-agent";
import { createModel } from "../model.js";
import { CuratorAgent } from "./curator.js";
import { PoetAgent } from "./poet.js";
import { DesignerAgent } from "./designer.js";
import { CriticAgent } from "./critic.js";
import { MusicianAgent } from "./musician.js";

export interface AikuAgents {
  readonly curator: CuratorAgent;
  readonly poet: PoetAgent;
  readonly designer: DesignerAgent;
  readonly critic: CriticAgent;
  readonly musician: MusicianAgent;
}

export async function createAgents(): Promise<AikuAgents> {
  const model = createModel();

  const createSession = async (): Promise<AgentSession> => {
    const { session } = await createAgentSession({ model });
    return session;
  };

  const createMusicianSession = async (): Promise<AgentSession> => {
    const { session } = await createAgentSession({ model, noTools: "all" });
    return session;
  };

  const [curatorSession, poetSession, designerSession, criticSession, musicianSession] =
    await Promise.all([
      createSession(),
      createSession(),
      createSession(),
      createSession(),
      createMusicianSession(),
    ]);

  return {
    curator: new CuratorAgent(curatorSession),
    poet: new PoetAgent(poetSession),
    designer: new DesignerAgent(designerSession),
    critic: new CriticAgent(criticSession),
    musician: new MusicianAgent(musicianSession),
  };
}

export { OrchestratorAgent, runAgent } from "./orchestrator.js";

export type { CuratorAgent, DictionaryEntry } from "./curator.js";
export type { PoetAgent, Haiku } from "./poet.js";
export type { DesignerAgent, VisualTreatment } from "./designer.js";
export type { CriticAgent, Verdict } from "./critic.js";
export type { MusicianAgent, Arpeggio, NoteEvent, SoundConfig } from "./musician.js";

