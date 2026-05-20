import * as Tone from "https://cdn.jsdelivr.net/npm/tone@15.0.4/+esm";

let currentSynth = null;
let currentEffects = [];
let timeouts = [];
let isPlaying = false;

const LINE_DELAYS = [500, 1200, 1900];

function midiToNote(midi) {
  return Tone.Frequency(midi, "midi").toNote();
}

function createEffect(name, config) {
  switch (name) {
    case "filter":
      return new Tone.Filter({
        frequency: config.frequency ?? 2000,
        type: config.type ?? "lowpass",
        rolloff: -12,
      });
    case "reverb":
      return new Tone.Reverb({
        decay: config.decay ?? 5,
        wet: config.wet ?? 0.4,
      });
    case "delay":
      return new Tone.PingPongDelay({
        delayTime: config.delayTime ?? "8n",
        feedback: config.feedback ?? 0.2,
        wet: config.wet ?? 0.15,
      });
    case "feedbackDelay":
      return new Tone.FeedbackDelay({
        delayTime: config.delayTime ?? "8n",
        feedback: config.feedback ?? 0.2,
        wet: config.wet ?? 0.15,
      });
    case "chorus":
      return new Tone.Chorus({
        frequency: config.frequency ?? 1,
        depth: config.depth ?? 0.5,
        wet: config.wet ?? 0.3,
      });
    case "phaser":
      return new Tone.Phaser({
        frequency: config.frequency ?? 0.5,
        octaves: config.octaves ?? 3,
        wet: config.wet ?? 0.3,
      });
    case "tremolo":
      return new Tone.Tremolo({
        frequency: config.frequency ?? 5,
        depth: config.depth ?? 0.5,
        wet: config.wet ?? 0.5,
      });
    case "vibrato":
      return new Tone.Vibrato({
        frequency: config.frequency ?? 5,
        depth: config.depth ?? 0.1,
        wet: config.wet ?? 0.5,
      });
    case "distortion":
      return new Tone.Distortion({
        distortion: config.distortion ?? 0.3,
        wet: config.wet ?? 0.3,
      });
    case "bitCrusher":
      return new Tone.BitCrusher({
        bits: config.bits ?? 8,
        wet: config.wet ?? 0.3,
      });
    case "chebyshev":
      return new Tone.Chebyshev({
        order: config.order ?? 20,
        wet: config.wet ?? 0.3,
      });
    case "frequencyShifter":
      return new Tone.FrequencyShifter({
        frequency: config.frequency ?? 10,
        wet: config.wet ?? 0.3,
      });
    case "autoFilter":
      return new Tone.AutoFilter({
        frequency: config.frequency ?? 1,
        depth: config.depth ?? 0.5,
        baseFrequency: config.baseFrequency ?? 800,
      });
    case "autoWah":
      return new Tone.AutoWah({
        frequency: config.frequency ?? 1,
        depth: config.depth ?? 0.5,
        baseFrequency: config.baseFrequency ?? 800,
      });
    case "stereoWidener":
      return new Tone.StereoWidener({
        width: config.width ?? 0.8,
      });
    case "compressor":
      return new Tone.Compressor({
        threshold: config.threshold ?? -24,
        ratio: config.ratio ?? 3,
      });
    case "convolver":
      return new Tone.Convolver({
        wet: config.wet ?? 0.3,
      });
    case "freeverb":
      return new Tone.Freeverb({
        roomSize: config.roomSize ?? 0.7,
        dampening: config.dampening ?? 3000,
        wet: config.wet ?? 0.4,
      });
    case "combFilter":
      return new Tone.CombFilter({
        delayTime: config.delayTime ?? 0.01,
        resonance: config.resonance ?? 0.5,
        dampening: config.dampening ?? 3000,
      });
    case "midSide":
      return new Tone.MidSideEffect();
    case "gain":
      return new Tone.Gain({
        gain: config.gain ?? 1,
      });
    default:
      console.warn(`Unknown effect: ${name}`);
      return null;
  }
}

function createSynthChain(sound) {
  const effects = [];

  const envelope = sound.synth?.envelope ?? {};
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: sound.synth?.oscillator?.type ?? "triangle" },
    envelope: {
      attack: envelope.attack ?? 0.005,
      decay: envelope.decay ?? 0.4,
      sustain: envelope.sustain ?? 0.15,
      release: envelope.release ?? 1.8,
    },
  });
  synth.volume.value = -18;

  const routing = sound.routing ?? [];
  let lastNode = synth;

  for (const effectName of routing) {
    const config = sound[effectName];
    if (!config) continue;
    const effect = createEffect(effectName, config);
    if (effect) {
      lastNode.connect(effect);
      lastNode = effect;
      effects.push(effect);
    }
  }

  lastNode.toDestination();
  currentEffects = effects;

  return { synth };
}

export async function playArpeggio(arpeggio) {
  await Tone.getContext().resume();

  stopMelody();

  const { synth } = createSynthChain(arpeggio.sound);
  currentSynth = synth;
  isPlaying = true;

  arpeggio.notes.forEach((note, i) => {
    const timeout = setTimeout(() => {
      if (currentSynth === synth) {
        synth.triggerAttackRelease(
          midiToNote(note.midi),
          note.duration,
          undefined,
          note.velocity,
        );
      }
    }, LINE_DELAYS[i]);
    timeouts.push(timeout);
  });
}

export function stopMelody() {
  timeouts.forEach(t => clearTimeout(t));
  timeouts = [];

  if (currentSynth) {
    try { currentSynth.releaseAll(); } catch { /* ignore */ }
    currentSynth.dispose();
    currentSynth = null;
  }

  currentEffects.forEach(e => e.dispose());
  currentEffects = [];

  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  isPlaying = false;
}
