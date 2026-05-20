import { BaseAgent } from "./base.js";
import { arpeggioPrompt, arpeggioRetryPrompt } from "../prompts.js";

export interface NoteEvent {
  midi: number;
  duration: string;
  velocity: number;
}

export interface SoundConfig {
  synth?: {
    oscillator?: { type?: string };
    envelope?: { attack?: number; decay?: number; sustain?: number; release?: number };
  };
  filter?: { frequency?: number; type?: string };
  reverb?: { decay?: number; wet?: number };
  delay?: { delayTime?: string; feedback?: number; wet?: number };
  feedbackDelay?: { delayTime?: string; feedback?: number; wet?: number };
  chorus?: { frequency?: number; depth?: number; wet?: number };
  phaser?: { frequency?: number; octaves?: number; wet?: number };
  tremolo?: { frequency?: number; depth?: number; wet?: number };
  vibrato?: { frequency?: number; depth?: number; wet?: number };
  distortion?: { distortion?: number; wet?: number };
  bitCrusher?: { bits?: number; wet?: number };
  chebyshev?: { order?: number; wet?: number };
  frequencyShifter?: { frequency?: number; wet?: number };
  autoFilter?: { frequency?: number; depth?: number; baseFrequency?: number };
  autoWah?: { frequency?: number; depth?: number; baseFrequency?: number };
  stereoWidener?: { width?: number };
  compressor?: { threshold?: number; ratio?: number };
  convolver?: { wet?: number };
  freeverb?: { roomSize?: number; dampening?: number; wet?: number };
  combFilter?: { delayTime?: number; resonance?: number; dampening?: number };
  midSide?: { mid?: number; side?: number };
  gain?: { gain?: number };
  routing?: string[];
}

export interface Arpeggio {
  sound: SoundConfig;
  notes: NoteEvent[];
}

const MAX_RETRIES = 2;

export class MusicianAgent extends BaseAgent {
  readonly name = "Musician";
  readonly purpose = "Generates chord tones and sound design for each haiku line";

  async composeArpeggio(opts: {
    haiku: string;
    colors: string[];
    signature: string;
    word: string;
  }): Promise<Arpeggio> {
    const output = await this.ask(arpeggioPrompt(opts));
    return this.parseArpeggioWithRetry(output);
  }

  private async parseArpeggioWithRetry(output: string): Promise<Arpeggio> {
    let lastErr: Error | undefined;
    let currentOutput = output;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const json = this.extractJSON(currentOutput) as Arpeggio;
        if (!json.notes || !Array.isArray(json.notes) || json.notes.length !== 3) {
          throw new Error("Expected exactly 3 notes");
        }
        if (!json.sound) {
          throw new Error("Missing sound config");
        }
        return json;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES) {
          console.log(
            `    [${this.name}] JSON parse failed, retrying... (${lastErr.message})`,
          );
          currentOutput = await this.ask(arpeggioRetryPrompt());
        }
      }
    }

    throw lastErr;
  }
}
