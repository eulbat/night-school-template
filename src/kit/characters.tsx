import React from 'react';
import { random, useCurrentFrame } from 'remotion';
import { C, alpha, shade } from './theme';

export type Mood = 'happy' | 'wow' | 'meh' | 'sad' | 'think' | 'grin';

/**
 * "Bit": the show's mascot. A round little creature with an antenna.
 * Use it as the viewer's stand-in: it reacts, wonders, gets confused, has the
 * "aha" moment. Several Bits with different colours make a crowd, a team,
 * users, servers with personality, etc.
 *
 * Place inside <Abs>. Size is the body diameter in px.
 */
export const Bit: React.FC<{
  size?: number;
  color?: string;
  mood?: Mood;
  /** Where the pupils look, each in [-1, 1]. */
  look?: [number, number];
  /** Flap the mouth while true. */
  talking?: boolean;
  /** Make the antenna bulb glow (an idea!). */
  idea?: boolean;
  /** Seed so a crowd of Bits doesn't blink in unison. */
  seed?: number;
  /** Mirror horizontally. */
  flip?: boolean;
  /** Small idle bounce. */
  bounce?: boolean;
}> = ({ size = 220, color = C.yellow, mood = 'happy', look = [0, 0], talking, idea, seed = 0, flip, bounce = true }) => {
  const frame = useCurrentFrame();
  // Blink: every ~2.5–4.5s for 5 frames, staggered by seed.
  const period = 75 + Math.floor(random(`blink-${seed}`) * 60);
  const offset = Math.floor(random(`blinkoff-${seed}`) * period);
  const bt = (frame + offset) % period;
  const blink = bt < 5 ? Math.abs(bt - 2.5) / 2.5 : 1;

  const squash = bounce ? Math.sin((frame + seed * 13) / 9) * 0.025 : 0;
  const mouthOpen = talking ? 0.3 + Math.abs(Math.sin((frame + seed * 7) / 2.6)) * 0.7 : 0;

  const lx = look[0] * 7;
  const ly = look[1] * 6;
  const dark = shade(color, -0.3);
  const light = shade(color, 0.35);

  const mouth = (() => {
    if (talking) return <ellipse cx={100} cy={128} rx={14} ry={4 + 12 * mouthOpen} fill={C.ink} />;
    switch (mood) {
      case 'wow':
        return <ellipse cx={100} cy={130} rx={11} ry={14} fill={C.ink} />;
      case 'meh':
        return <path d="M84 128 L116 128" stroke={C.ink} strokeWidth={6} strokeLinecap="round" />;
      case 'sad':
        return <path d="M82 134 Q100 118 118 134" stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />;
      case 'think':
        return <path d="M86 130 Q100 126 114 122" stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />;
      case 'grin':
        return <path d="M78 120 Q100 150 122 120 Z" fill={C.ink} />;
      default:
        return <path d="M80 122 Q100 142 120 122" stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />;
    }
  })();

  const browTilt = mood === 'sad' ? -8 : mood === 'think' ? 10 : mood === 'wow' ? 0 : 0;
  const bulbGlow = idea ? 0.6 + Math.sin(frame / 4) * 0.25 : 0;

  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 -45 200 250"
      style={{
        overflow: 'visible',
        transform: `scale(${flip ? -1 : 1}, 1) scale(${1 + squash}, ${1 - squash})`,
        transformOrigin: '50% 100%',
      }}
    >
      {/* antenna */}
      <path d="M100 18 Q104 -8 116 -22" stroke={dark} strokeWidth={6} fill="none" strokeLinecap="round" />
      {idea ? <circle cx={118} cy={-26} r={30} fill={alpha(C.yellow, 0.35 * bulbGlow)} /> : null}
      <circle cx={118} cy={-26} r={11} fill={idea ? C.yellow : light} />
      {/* feet */}
      <ellipse cx={72} cy={192} rx={22} ry={11} fill={dark} />
      <ellipse cx={128} cy={192} rx={22} ry={11} fill={dark} />
      {/* body */}
      <circle cx={100} cy={105} r={88} fill={color} />
      <path d="M22 130 A88 88 0 0 0 178 130 A92 80 0 0 1 22 130 Z" fill={dark} opacity={0.45} />
      <ellipse cx={62} cy={52} rx={24} ry={14} fill={light} opacity={0.6} transform="rotate(-30 62 52)" />
      {/* cheeks */}
      <ellipse cx={46} cy={118} rx={12} ry={7} fill={C.pink} opacity={0.45} />
      <ellipse cx={154} cy={118} rx={12} ry={7} fill={C.pink} opacity={0.45} />
      {/* eyes */}
      <g transform={`translate(0 ${100 * (1 - blink) * 0})`}>
        {[70, 130].map((ex, i) => (
          <g key={ex} transform={`translate(${ex} 86) scale(1 ${blink})`}>
            <ellipse cx={0} cy={0} rx={21} ry={25} fill={C.white} />
            <circle cx={lx} cy={ly + 2} r={12} fill={C.ink} />
            <circle cx={lx + 4} cy={ly - 3} r={4} fill={C.white} />
            {mood === 'sad' || mood === 'think' ? (
              <path
                d={`M-20 -34 L20 -34`}
                stroke={dark}
                strokeWidth={6}
                strokeLinecap="round"
                transform={`rotate(${i === 0 ? browTilt : -browTilt})`}
              />
            ) : null}
          </g>
        ))}
      </g>
      {mouth}
    </svg>
  );
};

/** A row/cluster of Bits, handy for "users", "a team", "a population". */
export const Crowd: React.FC<{
  n?: number;
  size?: number;
  colors?: string[];
  spacing?: number;
  mood?: Mood;
}> = ({ n = 5, size = 120, colors = [C.yellow, C.pink, C.teal, C.orange, C.blue, C.green], spacing, mood = 'happy' }) => (
  <div style={{ display: 'flex', gap: spacing ?? size * 0.15, alignItems: 'flex-end' }}>
    {Array.from({ length: n }, (_, i) => (
      <Bit key={i} size={size * (0.85 + random(`crowd-${i}`) * 0.3)} color={colors[i % colors.length]} seed={i + 1} mood={mood} />
    ))}
  </div>
);
