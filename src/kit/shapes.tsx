import React from 'react';
import { useCurrentFrame } from 'remotion';
import { getLength, getPointAtLength as rawPointAt } from '@remotion/paths';

const getPointAtLength = (d: string, l: number) => rawPointAt(d, l) ?? { x: 0, y: 0 };
import { C, FONT, alpha, shade } from './theme';
import { progress, usePop } from './core';

// ---------------------------------------------------------------------------
// Panel: the workhorse rounded card with two-tone shading.
// ---------------------------------------------------------------------------

export const Panel: React.FC<{
  w?: number;
  h?: number;
  color?: string;
  radius?: number;
  pad?: number;
  title?: string;
  titleColor?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ w, h, color = C.night2, radius = 32, pad = 32, title, titleColor = C.cream, style, children }) => (
  <div
    style={{
      width: w,
      height: h,
      background: `linear-gradient(180deg, ${shade(color, 0.08)} 0%, ${color} 55%, ${shade(color, -0.08)} 100%)`,
      borderRadius: radius,
      padding: pad,
      boxSizing: 'border-box',
      boxShadow: `inset 0 6px 0 ${alpha('#ffffff', 0.16)}, inset 0 -10px 0 ${alpha('#000000', 0.18)}, 0 24px 48px ${alpha('#000000', 0.35)}`,
      fontFamily: FONT.display,
      color: C.cream,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      ...style,
    }}
  >
    {title ? (
      <div style={{ fontWeight: 900, fontSize: 40, color: titleColor, letterSpacing: -0.5 }}>{title}</div>
    ) : null}
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Orb: glowing sphere (planets, particles, qubits, neurons).
// ---------------------------------------------------------------------------

export const Orb: React.FC<{ r?: number; color?: string; glow?: number; label?: string; labelSize?: number }> = ({
  r = 60,
  color = C.teal,
  glow = 0.6,
  label,
  labelSize,
}) => (
  <div style={{ position: 'relative', width: r * 2, height: r * 2 }}>
    <div
      style={{
        position: 'absolute',
        inset: -r * 0.6,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(color, 0.45 * glow)} 0%, ${alpha(color, 0)} 70%)`,
      }}
    />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 30%, ${shade(color, 0.45)} 0%, ${color} 45%, ${shade(color, -0.35)} 100%)`,
        boxShadow: `inset -${r * 0.12}px -${r * 0.16}px 0 ${alpha('#000000', 0.18)}`,
      }}
    />
    {label ? (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT.display,
          fontWeight: 900,
          fontSize: labelSize ?? r * 0.7,
          color: C.ink,
        }}
      >
        {label}
      </div>
    ) : null}
  </div>
);

// ---------------------------------------------------------------------------
// Token: a pill-shaped chip (words, tokens, packets, tags).
// ---------------------------------------------------------------------------

export const Token: React.FC<{
  text: string;
  color?: string;
  textColor?: string;
  size?: number;
  mono?: boolean;
}> = ({ text, color = C.yellow, textColor = C.ink, size = 40, mono }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${size * 0.25}px ${size * 0.55}px`,
      borderRadius: size,
      background: color,
      color: textColor,
      fontFamily: mono ? FONT.mono : FONT.display,
      fontWeight: mono ? 700 : 900,
      fontSize: size,
      whiteSpace: 'pre',
      boxShadow: `inset 0 ${size * 0.1}px 0 ${alpha('#ffffff', 0.3)}, inset 0 -${size * 0.12}px 0 ${alpha('#000000', 0.15)}, 0 8px 18px ${alpha('#000000', 0.3)}`,
    }}
  >
    {text}
  </div>
);

// ---------------------------------------------------------------------------
// Paths: Arrow (draw-on), Traveler (dot moving along a path).
// Coordinates are stage coordinates; render these directly inside the scene
// (not inside <Abs>), they draw on a full-stage SVG.
// ---------------------------------------------------------------------------

type Pt = [number, number];

/** Build an SVG path from a to b, optionally bent sideways by `bend` px. */
export const curve = (a: Pt, b: Pt, bend = 0): string => {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bend;
  const cy = my + (dx / len) * bend;
  return `M ${a[0]} ${a[1]} Q ${cx} ${cy} ${b[0]} ${b[1]}`;
};

const Stage: React.FC<{ children: React.ReactNode; z?: number }> = ({ children, z }) => (
  <svg
    width={1920}
    height={1080}
    viewBox="0 0 1920 1080"
    style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', zIndex: z, pointerEvents: 'none' }}
  >
    {children}
  </svg>
);

export const Arrow: React.FC<{
  from: Pt;
  to: Pt;
  bend?: number;
  at?: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: boolean;
  dashed?: boolean;
  /** Shorten both ends by this many px so arrows don't overlap the shapes they connect. */
  inset?: number;
  label?: string;
  z?: number;
}> = ({ from, to, bend = 0, at = 0, dur = 18, color = C.cream, width = 8, head = true, dashed, inset = 0, label, z }) => {
  const frame = useCurrentFrame();
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const a: Pt = [from[0] + (dx / len) * inset, from[1] + (dy / len) * inset];
  const b: Pt = [to[0] - (dx / len) * inset, to[1] - (dy / len) * inset];
  const d = curve(a, b, bend);
  const L = getLength(d);
  const p = progress(frame, at, at + dur);
  if (frame < at) return null;
  const tip = getPointAtLength(d, L * p);
  const back = getPointAtLength(d, Math.max(0, L * p - 1));
  const ang = Math.atan2(tip.y - back.y, tip.x - back.x);
  const hs = width * 2.6;
  const mid = getPointAtLength(d, L / 2);
  return (
    <Stage z={z}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? `${width * 2} ${width * 2}` : `${L} ${L}`}
        strokeDashoffset={dashed ? -frame : L * (1 - p)}
        opacity={dashed ? p : 1}
      />
      {head && p > 0.05 ? (
        <polygon
          points={`0,0 ${-hs},${-hs * 0.6} ${-hs * 0.75},0 ${-hs},${hs * 0.6}`}
          fill={color}
          transform={`translate(${tip.x} ${tip.y}) rotate(${(ang * 180) / Math.PI})`}
          strokeLinejoin="round"
          stroke={color}
          strokeWidth={width * 0.5}
        />
      ) : null}
      {label && p > 0.6 ? (
        <text
          x={mid.x}
          y={mid.y - 20}
          textAnchor="middle"
          fontFamily={FONT.display}
          fontWeight={800}
          fontSize={32}
          fill={color}
          opacity={progress(frame, at + dur * 0.6, at + dur)}
        >
          {label}
        </text>
      ) : null}
    </Stage>
  );
};

/** Dots travelling along a path, e.g. packets on a wire or signals in a network. */
export const Traveler: React.FC<{
  from: Pt;
  to: Pt;
  bend?: number;
  at?: number;
  /** Frames for one trip. */
  period?: number;
  count?: number;
  color?: string;
  r?: number;
  loop?: boolean;
  z?: number;
}> = ({ from, to, bend = 0, at = 0, period = 40, count = 1, color = C.yellow, r = 12, loop = true, z }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const d = curve(from, to, bend);
  const L = getLength(d);
  const dots = Array.from({ length: count }, (_, i) => {
    const t = (frame - at) / period - i / count;
    if (t < 0 || (!loop && t > 1)) return null;
    const u = loop ? t % 1 : Math.min(1, t);
    const pt = getPointAtLength(d, L * u);
    const fade = Math.min(1, u * 6, (1 - u) * 6);
    return (
      <g key={i} opacity={loop ? fade : 1}>
        <circle cx={pt.x} cy={pt.y} r={r * 2.2} fill={alpha(color, 0.25)} />
        <circle cx={pt.x} cy={pt.y} r={r} fill={color} />
      </g>
    );
  });
  return <Stage z={z}>{dots}</Stage>;
};

/** A pulsing ring to point at something. Place inside <Abs>. */
export const Ring: React.FC<{ r?: number; color?: string; at?: number; width?: number }> = ({
  r = 90,
  color = C.yellow,
  at = 0,
  width = 6,
}) => {
  const frame = useCurrentFrame();
  const s = usePop(at);
  const t = ((frame - at) % 40) / 40;
  if (frame < at) return null;
  return (
    <div style={{ position: 'relative', width: r * 2, height: r * 2 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `${width}px solid ${color}`,
          transform: `scale(${s})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `${width / 2}px solid ${color}`,
          transform: `scale(${1 + t * 0.35})`,
          opacity: 1 - t,
        }}
      />
    </div>
  );
};

/** Big tick or cross mark with a pop. Place inside <Abs>. */
export const Mark: React.FC<{ kind: 'check' | 'cross'; size?: number; at?: number }> = ({
  kind,
  size = 120,
  at = 0,
}) => {
  const s = usePop(at, { damping: 9 });
  const color = kind === 'check' ? C.green : C.red;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        transform: `scale(${s})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `inset 0 6px 0 ${alpha('#ffffff', 0.3)}, inset 0 -8px 0 ${alpha('#000000', 0.2)}, 0 12px 24px ${alpha('#000000', 0.3)}`,
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 10 10">
        {kind === 'check' ? (
          <path d="M1.5 5.5 L4 8 L8.5 2.5" stroke={C.white} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M2 2 L8 8 M8 2 L2 8" stroke={C.white} strokeWidth={1.6} strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
};

/** Soft radial light behind an important object. Place inside <Abs>. */
export const Glow: React.FC<{ r?: number; color?: string; strength?: number }> = ({
  r = 300,
  color = C.yellow,
  strength = 0.35,
}) => (
  <div
    style={{
      width: r * 2,
      height: r * 2,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${alpha(color, strength)} 0%, ${alpha(color, 0)} 70%)`,
    }}
  />
);

/** A dial/knob. `value` in [0, 1] maps to the needle angle (-135°…135°). Place inside <Abs>. */
export const Knob: React.FC<{ value: number; size?: number; color?: string; label?: string }> = ({
  value,
  size = 110,
  color = C.orange,
  label,
}) => {
  const ang = -135 + 270 * Math.max(0, Math.min(1, value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="-50 -50 100 100">
        {Array.from({ length: 11 }, (_, i) => {
          const a = ((-135 + 27 * i - 90) * Math.PI) / 180;
          return <circle key={i} cx={Math.cos(a) * 46} cy={Math.sin(a) * 46} r={2.4} fill={alpha(C.cream, 0.45)} />;
        })}
        <circle r={38} fill={shade(color, -0.3)} />
        <circle r={34} fill={color} />
        <ellipse cx={-10} cy={-14} rx={14} ry={8} fill={shade(color, 0.35)} opacity={0.6} transform="rotate(-30 -10 -14)" />
        <g transform={`rotate(${ang})`}>
          <rect x={-4} y={-32} width={8} height={22} rx={4} fill={C.cream} />
        </g>
      </svg>
      {label ? <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: size * 0.3, color: C.cream }}>{label}</div> : null}
    </div>
  );
};
