import React, { createContext, useContext } from 'react';
import {
  Easing,
  Html5Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ---------------------------------------------------------------------------
// Scene context: every scene knows when each narration line starts ("beats"),
// so visuals can be synced to what the narrator is saying.
// ---------------------------------------------------------------------------

export type SceneInfo = {
  /** Frame (relative to the scene start) at which each narration line starts. */
  beats: number[];
  /** Frame at which each narration line ends. */
  beatEnds: number[];
  /** Scene length in frames. */
  duration: number;
  /** For each line, the notes it plays (music lines only; empty for speech), in scene frames. */
  notes?: NoteEvent[][];
};

/** One note or chord of a music line: starts at frame `at`, lasts `frames`, MIDI pitches (60 = middle C). */
export type NoteEvent = { at: number; frames: number; midi: number[] };

export const SceneContext = createContext<SceneInfo>({ beats: [0], beatEnds: [60], duration: 150 });

/**
 * Start frame of each narration line in the current scene.
 * `const b = useBeats(); <Pop at={b[2]}>` pops in when line 3 starts.
 * Out-of-range indexes clamp to the last line so a visual never disappears.
 */
export const useBeats = (): number[] & { end: (i: number) => number } => {
  const { beats, beatEnds } = useContext(SceneContext);
  const proxy = new Proxy(beats, {
    get(target, prop) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        const i = Number(prop);
        return target[Math.min(i, target.length - 1)] ?? 0;
      }
      return Reflect.get(target, prop);
    },
  }) as number[] & { end: (i: number) => number };
  proxy.end = (i: number) => beatEnds[Math.min(i, beatEnds.length - 1)] ?? 0;
  return proxy;
};

export const useScene = () => useContext(SceneContext);

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

export const easeInOut = Easing.bezier(0.45, 0, 0.2, 1);

/** 0→1 between frames a and b, eased, clamped. */
export const progress = (frame: number, a: number, b: number, easing = easeInOut) =>
  interpolate(frame, [a, Math.max(b, a + 1)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

/** Map frame through keyframes to values, eased and clamped. */
export const tween = (frame: number, frames: number[], values: number[], easing = easeInOut) =>
  interpolate(frame, frames, values, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

/** Bouncy 0→1 spring starting at `at`. */
export const usePop = (at = 0, opts: { damping?: number; stiffness?: number; mass?: number } = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - at,
    fps,
    config: { damping: opts.damping ?? 11, stiffness: opts.stiffness ?? 170, mass: opts.mass ?? 0.7 },
  });
};

// ---------------------------------------------------------------------------
// Layout + motion wrappers
// ---------------------------------------------------------------------------

type AbsProps = {
  x?: number;
  y?: number;
  /** Anchor: 'center' (default) or 'topleft'. */
  anchor?: 'center' | 'topleft';
  rotate?: number;
  scale?: number;
  opacity?: number;
  z?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** Absolutely position children on the 1920×1080 stage. (x, y) is the centre by default. */
export const Abs: React.FC<AbsProps> = ({
  x = 960,
  y = 540,
  anchor = 'center',
  rotate = 0,
  scale = 1,
  opacity = 1,
  z,
  style,
  children,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `${anchor === 'center' ? 'translate(-50%, -50%) ' : ''}rotate(${rotate}deg) scale(${scale})`,
      opacity,
      zIndex: z,
      ...style,
    }}
  >
    {children}
  </div>
);

type MotionProps = {
  at?: number;
  /** Frame at which to animate out. */
  out?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

/** Springy scale-in (the signature "pop"). Optional `out` frame to shrink away. */
export const Pop: React.FC<MotionProps & { from?: number }> = ({ at = 0, out, from = 0, children, style }) => {
  const frame = useCurrentFrame();
  const s = usePop(at);
  const o = out !== undefined ? 1 - progress(frame, out, out + 10) : 1;
  const scale = (from + (1 - from) * s) * o;
  return (
    <div style={{ transform: `scale(${Math.max(0, scale)})`, opacity: frame < at ? 0 : 1, ...style }}>{children}</div>
  );
};

/** Opacity fade in (and optional fade out). */
export const Fade: React.FC<MotionProps & { dur?: number }> = ({ at = 0, out, dur = 12, children, style }) => {
  const frame = useCurrentFrame();
  const o = progress(frame, at, at + dur) * (out !== undefined ? 1 - progress(frame, out, out + dur) : 1);
  return <div style={{ opacity: o, ...style }}>{children}</div>;
};

/** Slide + fade in from a direction. */
export const Slide: React.FC<MotionProps & { from?: 'left' | 'right' | 'up' | 'down'; dist?: number }> = ({
  at = 0,
  out,
  from = 'down',
  dist = 60,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = progress(frame, at, at + 16);
  const q = out !== undefined ? progress(frame, out, out + 12) : 0;
  const d = (1 - p) * dist - q * dist;
  const [dx, dy] = { left: [-d, 0], right: [d, 0], up: [0, -d], down: [0, d] }[from];
  return (
    <div style={{ transform: `translate(${dx}px, ${dy}px)`, opacity: p * (1 - q), ...style }}>{children}</div>
  );
};

/** Gentle idle bobbing so nothing on screen is ever perfectly still. */
export const Float: React.FC<{ amp?: number; speed?: number; phase?: number; children?: React.ReactNode }> = ({
  amp = 8,
  speed = 1,
  phase = 0,
  children,
}) => {
  const frame = useCurrentFrame();
  const y = Math.sin((frame / 30) * speed * Math.PI + phase) * amp;
  const r = Math.sin((frame / 30) * speed * 0.7 * Math.PI + phase) * (amp / 8);
  return <div style={{ transform: `translateY(${y}px) rotate(${r}deg)` }}>{children}</div>;
};

/** Continuous pulse (scale oscillation), e.g. to draw attention. */
export const Pulse: React.FC<{ at?: number; amp?: number; speed?: number; children?: React.ReactNode }> = ({
  at = 0,
  amp = 0.06,
  speed = 2,
  children,
}) => {
  const frame = useCurrentFrame();
  const s = frame < at ? 1 : 1 + Math.sin(((frame - at) / 30) * speed * Math.PI) * amp;
  return <div style={{ transform: `scale(${s})` }}>{children}</div>;
};

export type CamKey = [frame: number, view: { x?: number; y?: number; s?: number; r?: number }];

/**
 * Camera moves over the whole stage. Keys are [frame, {x, y, s, r}] where (x, y)
 * is the stage point to centre on (default 960, 540) and s the zoom.
 * <Camera keys={[[0, {s: 1}], [b[2], {x: 600, y: 400, s: 1.8}]]}>…</Camera>
 */
export const Camera: React.FC<{ keys: CamKey[]; children?: React.ReactNode }> = ({ keys, children }) => {
  const frame = useCurrentFrame();
  const sorted = [...keys].sort((a, b) => a[0] - b[0]);
  const fr = sorted.map((k) => k[0]);
  const val = (prop: 'x' | 'y' | 's' | 'r', def: number) => {
    if (sorted.length === 1) return sorted[0][1][prop] ?? def;
    // Hold each key for a beat, then ease to the next one over ~24 frames.
    const frames: number[] = [];
    const values: number[] = [];
    sorted.forEach(([f, v], i) => {
      const value = v[prop] ?? def;
      if (i > 0) {
        const prev = frames[frames.length - 1];
        frames.push(Math.max(prev + 1, f - 24));
        values.push(values[values.length - 1]);
      }
      frames.push(i === 0 ? f : Math.max(frames[frames.length - 1] + 1, f));
      values.push(value);
    });
    return tween(frame, frames, values);
  };
  const x = val('x', 960);
  const y = val('y', 540);
  const s = val('s', 1);
  const r = val('r', 0);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transformOrigin: `${x}px ${y}px`,
        transform: `translate(${960 - x}px, ${540 - y}px) scale(${s}) rotate(${r}deg)`,
      }}
    >
      {children}
    </div>
  );
};

/** Run a render function for each item with staggered start frames. */
export const stagger = (at: number, step: number, i: number) => at + i * step;

// ---------------------------------------------------------------------------
// Sound effects (generated by scripts/tts.py into public/sfx)
// ---------------------------------------------------------------------------

export type SfxName = 'pop' | 'whoosh' | 'ding' | 'click' | 'swell';

/** Play a sound effect at a frame. Use sparingly: on big reveals, not every element. */
export const Sfx: React.FC<{ at: number; name: SfxName; volume?: number }> = ({ at, name, volume = 0.35 }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={60} layout="none">
    <Html5Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);
