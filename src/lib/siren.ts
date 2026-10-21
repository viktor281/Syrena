import { SEVERITY, type Level } from "@/data/levels";

let ctx: AudioContext | null = null;
let timers: number[] = [];
let nodes: AudioNode[] = [];
let loopKind: Level | "idle" = "idle";
let previewing = false;
let previewTimer = 0;
let enabled = false;
let lastCounts: Record<Level, number> | null = null;
let voice: HTMLAudioElement | null = null;

function audio(): AudioContext | null {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

export async function unlockAudio(): Promise<void> {
  const context = audio();
  if (context && context.state === "suspended") await context.resume();
}

function stopVoice(): void {
  if (!voice) return;
  voice.pause();
  voice.src = "";
  voice = null;
}

function playVoice(level: Level): void {
  stopVoice();
  const clip = new Audio(`/sounds/${level}.mp3`);
  clip.volume = 1;
  voice = clip;
  void clip.play().catch(() => {
    /* tone still runs if the clip is blocked */
  });
}

function later(fn: () => void, ms: number): void {
  timers.push(window.setTimeout(fn, ms));
}

function stopLoop(): void {
  for (const id of timers) window.clearTimeout(id);
  timers = [];
  for (const node of nodes) {
    const stoppable = node as OscillatorNode & { stop?: () => void };
    try {
      stoppable.stop?.();
    } catch {
      /* already stopped */
    }
    try {
      node.disconnect();
    } catch {
      /* already disconnected */
    }
  }
  nodes = [];
  loopKind = "idle";
}

function track<T extends AudioNode>(node: T): T {
  nodes.push(node);
  return node;
}

function masterGain(volume: number): GainNode | null {
  const context = audio();
  if (!context) return null;
  const gain = track(context.createGain());
  gain.gain.value = volume;
  gain.connect(context.destination);
  return gain;
}

function tone(freq: number, type: OscillatorType, volume: number, seconds: number): void {
  const context = audio();
  if (!context) return;
  const gain = context.createGain();
  const osc = context.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const now = context.currentTime;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.02, seconds));
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(now + seconds + 0.03);
}

function horn(freq: number, seconds: number): void {
  const context = audio();
  if (!context) return;
  const gain = context.createGain();
  const osc = context.createOscillator();
  const filter = context.createBiquadFilter();
  osc.type = "sawtooth";
  osc.frequency.value = freq;
  filter.type = "lowpass";
  filter.frequency.value = 900;
  const now = context.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(now + seconds + 0.03);
}

function playAllClearTones(): void {
  tone(784, "sine", 0.06, 0.28);
  later(() => tone(659, "sine", 0.055, 0.28), 220);
  later(() => tone(523, "sine", 0.05, 0.42), 440);
}

function startKind(kind: Level): void {
  stopLoop();
  loopKind = kind;

  if (kind === "red") {
    const context = audio();
    const gain = masterGain(0.1);
    if (!context || !gain) return;
    const filter = track(context.createBiquadFilter());
    filter.type = "lowpass";
    filter.frequency.value = 1600;
    filter.connect(gain);
    const oscA = track(context.createOscillator());
    const oscB = track(context.createOscillator());
    oscA.type = "sawtooth";
    oscB.type = "sawtooth";
    oscA.connect(filter);
    oscB.connect(filter);
    oscA.start();
    oscB.start();
    const started = performance.now();
    const wobble = () => {
      if (loopKind !== "red" || !ctx) return;
      const t = (performance.now() - started) / 1000;
      const phase = (Math.sin((t * Math.PI * 2) / 7.2) + 1) / 2;
      const freq = 300 + phase * phase * 640;
      oscA.frequency.setTargetAtTime(freq, ctx.currentTime, 0.035);
      oscB.frequency.setTargetAtTime(freq * 1.5, ctx.currentTime, 0.04);
      later(wobble, 40);
    };
    wobble();
    return;
  }

  if (kind === "high") {
    const burst = () => {
      if (loopKind !== "high") return;
      tone(988, "square", 0.055, 0.07);
      later(() => loopKind === "high" && tone(988, "square", 0.055, 0.07), 120);
      later(() => loopKind === "high" && tone(988, "square", 0.055, 0.07), 240);
      later(burst, 780);
    };
    burst();
    return;
  }

  if (kind === "yellow") {
    let high = false;
    const beep = () => {
      if (loopKind !== "yellow") return;
      high = !high;
      horn(high ? 680 : 430, 0.32);
      later(beep, 700);
    };
    beep();
    return;
  }

  if (kind === "artillery") {
    let step = 0;
    const tick = () => {
      if (loopKind !== "artillery") return;
      step += 1;
      if (step % 6 !== 0) horn(246, 0.14);
      later(tick, step % 6 === 0 ? 520 : 260);
    };
    tick();
    return;
  }

  if (kind === "street") {
    let step = 0;
    const tick = () => {
      if (loopKind !== "street") return;
      tone(step % 2 ? 880 : 554, "square", 0.05, 0.08);
      step += 1;
      later(tick, step % 2 === 0 ? 320 : 110);
    };
    tick();
    return;
  }

  if (kind === "chemical") {
    const burst = () => {
      if (loopKind !== "chemical") return;
      for (let i = 0; i < 7; i += 1) {
        later(() => {
          if (loopKind !== "chemical") return;
          const freq = 420 + ((i * 130) % 280);
          tone(freq, "square", i % 3 === 0 ? 0.012 : 0.05, 0.03);
        }, i * 42);
      }
      later(burst, 560);
    };
    burst();
    return;
  }

  if (kind === "radiation") {
    const tick = () => {
      if (loopKind !== "radiation") return;
      tone(1860, "square", 0.045, 0.016);
      later(tick, 95);
    };
    tick();
    return;
  }

  if (kind === "swamp") {
    const context = audio();
    const gain = masterGain(0.05);
    if (!context || !gain) return;
    const osc = track(context.createOscillator());
    osc.type = "sine";
    osc.connect(gain);
    osc.start();
    const started = performance.now();
    const wobble = () => {
      if (loopKind !== "swamp" || !ctx) return;
      const t = (performance.now() - started) / 1000;
      osc.frequency.setTargetAtTime(68 + (Math.sin(t * 1.3) + 1) * 32, ctx.currentTime, 0.08);
      later(wobble, 90);
    };
    wobble();
  }
}

function topLevel(counts: Record<Level, number>): Level {
  for (const level of SEVERITY) {
    if (level !== "none" && counts[level] > 0) return level;
  }
  return "none";
}

function applyTop(next: Level, announce: boolean): void {
  if (previewing) return;
  if (next === loopKind) return;
  const previous = loopKind;
  if (next === "none") {
    stopLoop();
    loopKind = "none";
    if (announce && previous !== "idle" && previous !== "none") {
      playAllClearTones();
      playVoice("none");
    }
    return;
  }
  startKind(next);
  if (announce) playVoice(next);
}

export function previewLevel(level: Level): void {
  void unlockAudio().then(() => {
    previewing = true;
    window.clearTimeout(previewTimer);
    if (level === "none") {
      stopLoop();
      loopKind = "none";
      playAllClearTones();
      playVoice("none");
    } else {
      startKind(level);
      playVoice(level);
    }
    previewTimer = window.setTimeout(() => {
      previewing = false;
      stopLoop();
      if (enabled && lastCounts) applyTop(topLevel(lastCounts), false);
    }, 3400);
  });
}

export function syncAlerts(counts: Record<Level, number>, soundOn: boolean): void {
  enabled = soundOn;
  lastCounts = counts;
  if (!soundOn) {
    previewing = false;
    window.clearTimeout(previewTimer);
    stopLoop();
    stopVoice();
    return;
  }
  if (!ctx || ctx.state === "suspended") return;
  applyTop(topLevel(counts), true);
}

let buzzNodes: AudioNode[] = [];
let buzzTimer = 0;
let buzzOn = false;
let prevMissiles = 0;

function stopBuzz(): void {
  window.clearTimeout(buzzTimer);
  buzzTimer = 0;
  for (const node of buzzNodes) {
    try {
      (node as OscillatorNode).stop?.();
    } catch {
      /* already stopped */
    }
    try {
      node.disconnect();
    } catch {
      /* already disconnected */
    }
  }
  buzzNodes = [];
  buzzOn = false;
}

function startBuzz(): void {
  const context = audio();
  if (!context || buzzOn) return;
  const gain = context.createGain();
  const osc = context.createOscillator();
  const over = context.createOscillator();
  gain.gain.value = 0.045;
  osc.type = "sawtooth";
  over.type = "square";
  osc.frequency.value = 118;
  over.frequency.value = 236;
  const overGain = context.createGain();
  overGain.gain.value = 0.25;
  osc.connect(gain);
  over.connect(overGain);
  overGain.connect(gain);
  gain.connect(context.destination);
  osc.start();
  over.start();
  buzzNodes = [osc, over, overGain, gain];
  buzzOn = true;
  const started = performance.now();
  const wobble = () => {
    if (!buzzOn || !ctx) return;
    const t = (performance.now() - started) / 1000;
    const freq = 108 + (Math.sin(t * 42) + 1) * 28;
    osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.01);
    over.frequency.setTargetAtTime(freq * 2.01, ctx.currentTime, 0.01);
    buzzTimer = window.setTimeout(wobble, 30);
  };
  wobble();
}

function whoosh(): void {
  const context = audio();
  if (!context) return;
  const gain = context.createGain();
  const osc = context.createOscillator();
  osc.type = "sawtooth";
  const now = context.currentTime;
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(1600, now + 0.55);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(now + 0.66);
}

function thump(): void {
  tone(72, "sine", 0.12, 0.22);
  tone(48, "triangle", 0.05, 0.28);
}

export function syncFlight(shaheds: number, missiles: number, soundOn: boolean): void {
  if (!soundOn) {
    stopBuzz();
    prevMissiles = missiles;
    return;
  }
  if (!ctx || ctx.state === "suspended") return;
  if (shaheds > 0 && !buzzOn) startBuzz();
  if (shaheds === 0 && buzzOn) stopBuzz();
  if (missiles > prevMissiles) whoosh();
  if (missiles < prevMissiles && prevMissiles > 0) thump();
  prevMissiles = missiles;
}

export function stopFlight(): void {
  stopBuzz();
  prevMissiles = 0;
}
