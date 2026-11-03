import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, alpha, shade } from './theme';

// Flat, chunky icons drawn in the same two-tone style. Place inside <Abs>.
// All take `size` (px, roughly the width) and `color`.

type IconProps = { size?: number; color?: string; label?: string };

const Shell: React.FC<{ size: number; vb: string; ratio?: number; label?: string; children: React.ReactNode }> = ({
  size,
  vb,
  ratio = 1,
  label,
  children,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.08 }}>
    <svg width={size} height={size * ratio} viewBox={vb} style={{ overflow: 'visible' }}>
      {children}
    </svg>
    {label ? (
      <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: Math.max(26, size * 0.2), color: C.cream }}>
        {label}
      </div>
    ) : null}
  </div>
);

/** Server rack with blinking LEDs. */
export const Server: React.FC<IconProps & { units?: number; busy?: boolean }> = ({
  size = 160,
  color = C.blue,
  label,
  units = 3,
  busy = true,
}) => {
  const frame = useCurrentFrame();
  const h = units * 40 + 10;
  return (
    <Shell size={size} vb={`0 0 120 ${h}`} ratio={h / 120} label={label}>
      {Array.from({ length: units }, (_, i) => {
        const y = 5 + i * 40;
        const on = busy ? Math.sin(frame / 3 + i * 2.1) > 0 : true;
        return (
          <g key={i}>
            <rect x={0} y={y} width={120} height={34} rx={8} fill={color} />
            <rect x={0} y={y} width={120} height={8} rx={4} fill={shade(color, 0.25)} />
            <rect x={0} y={y + 26} width={120} height={8} rx={4} fill={shade(color, -0.25)} />
            <circle cx={16} cy={y + 17} r={5} fill={on ? C.green : shade(C.green, -0.6)} />
            <circle cx={32} cy={y + 17} r={5} fill={C.yellow} opacity={0.8} />
            {[60, 72, 84, 96].map((x) => (
              <rect key={x} x={x} y={y + 11} width={6} height={12} rx={2} fill={shade(color, -0.35)} />
            ))}
          </g>
        );
      })}
    </Shell>
  );
};

/** Database cylinder. */
export const Database: React.FC<IconProps> = ({ size = 140, color = C.teal, label }) => (
  <Shell size={size} vb="0 0 100 120" ratio={1.2} label={label}>
    <path d="M0 18 L0 102 A50 16 0 0 0 100 102 L100 18 Z" fill={color} />
    <path d="M0 102 A50 16 0 0 0 100 102 L100 92 A50 16 0 0 1 0 92 Z" fill={shade(color, -0.25)} />
    <path d="M0 46 A50 16 0 0 0 100 46" stroke={shade(color, -0.3)} strokeWidth={4} fill="none" />
    <path d="M0 74 A50 16 0 0 0 100 74" stroke={shade(color, -0.3)} strokeWidth={4} fill="none" />
    <ellipse cx={50} cy={18} rx={50} ry={16} fill={shade(color, 0.3)} />
    <ellipse cx={50} cy={18} rx={36} ry={9} fill={shade(color, 0.15)} />
  </Shell>
);

/** Smartphone with a little UI. */
export const Phone: React.FC<IconProps> = ({ size = 110, color = C.pink, label }) => (
  <Shell size={size} vb="0 0 70 130" ratio={130 / 70} label={label}>
    <rect x={0} y={0} width={70} height={130} rx={12} fill={shade(color, -0.2)} />
    <rect x={4} y={10} width={62} height={108} rx={6} fill={C.cream} />
    <rect x={10} y={18} width={50} height={22} rx={4} fill={color} />
    <rect x={10} y={46} width={36} height={6} rx={3} fill={C.dim} />
    <rect x={10} y={58} width={44} height={6} rx={3} fill={C.dim} />
    <rect x={10} y={70} width={30} height={6} rx={3} fill={C.dim} />
    <circle cx={35} cy={124} r={3} fill={shade(color, 0.3)} />
  </Shell>
);

/** Laptop. */
export const Laptop: React.FC<IconProps> = ({ size = 200, color = C.mist, label }) => (
  <Shell size={size} vb="0 0 160 105" ratio={105 / 160} label={label}>
    <rect x={18} y={0} width={124} height={86} rx={8} fill={shade(color, -0.3)} />
    <rect x={24} y={6} width={112} height={74} rx={4} fill={C.night} />
    <rect x={32} y={16} width={50} height={6} rx={3} fill={C.teal} />
    <rect x={32} y={28} width={80} height={6} rx={3} fill={C.pink} />
    <rect x={32} y={40} width={64} height={6} rx={3} fill={C.yellow} />
    <path d="M0 88 L160 88 L150 102 L10 102 Z" fill={color} />
    <rect x={64} y={88} width={32} height={5} rx={2} fill={shade(color, -0.2)} />
  </Shell>
);

/** Fluffy cloud. */
export const Cloud: React.FC<IconProps> = ({ size = 220, color = C.cream, label }) => (
  <Shell size={size} vb="0 0 200 120" ratio={0.6} label={label}>
    <g fill={color}>
      <circle cx={60} cy={70} r={40} />
      <circle cx={105} cy={52} r={50} />
      <circle cx={150} cy={75} r={36} />
      <rect x={30} y={70} width={150} height={44} rx={22} />
    </g>
    <rect x={30} y={98} width={150} height={16} rx={8} fill={shade(color, -0.12)} />
  </Shell>
);

/** Microchip / GPU. */
export const Chip: React.FC<IconProps & { text?: string }> = ({ size = 160, color = C.green, label, text }) => (
  <Shell size={size} vb="0 0 120 120" label={label}>
    {Array.from({ length: 5 }, (_, i) => (
      <g key={i} fill={shade(color, -0.35)}>
        <rect x={22 + i * 17} y={0} width={8} height={18} rx={2} />
        <rect x={22 + i * 17} y={102} width={8} height={18} rx={2} />
        <rect x={0} y={22 + i * 17} width={18} height={8} rx={2} />
        <rect x={102} y={22 + i * 17} width={18} height={8} rx={2} />
      </g>
    ))}
    <rect x={14} y={14} width={92} height={92} rx={12} fill={color} />
    <rect x={14} y={14} width={92} height={12} rx={6} fill={shade(color, 0.25)} />
    <rect x={32} y={32} width={56} height={56} rx={8} fill={shade(color, -0.25)} />
    {text ? (
      <text x={60} y={68} textAnchor="middle" fontFamily="Nunito" fontWeight={900} fontSize={20} fill={C.cream}>
        {text}
      </text>
    ) : null}
  </Shell>
);

/** Document / file with lines. */
export const Doc: React.FC<IconProps> = ({ size = 110, color = C.cream, label }) => (
  <Shell size={size} vb="0 0 90 115" ratio={115 / 90} label={label}>
    <path d="M0 8 Q0 0 8 0 L62 0 L90 28 L90 107 Q90 115 82 115 L8 115 Q0 115 0 107 Z" fill={color} />
    <path d="M62 0 L62 28 L90 28 Z" fill={shade(color, -0.2)} />
    {[42, 56, 70, 84].map((y, i) => (
      <rect key={y} x={14} y={y} width={i === 3 ? 36 : 62} height={7} rx={3.5} fill={C.dim} />
    ))}
  </Shell>
);

/** Padlock. `open` to unlock. */
export const Lock: React.FC<IconProps & { open?: boolean }> = ({ size = 110, color = C.yellow, label, open }) => (
  <Shell size={size} vb="0 0 100 120" ratio={1.2} label={label}>
    <path
      d={open ? 'M24 56 L24 34 A26 26 0 0 1 76 34 L76 26' : 'M24 56 L24 36 A26 26 0 0 1 76 36 L76 56'}
      stroke={C.mist}
      strokeWidth={12}
      fill="none"
      strokeLinecap="round"
    />
    <rect x={6} y={50} width={88} height={70} rx={14} fill={color} />
    <rect x={6} y={50} width={88} height={12} rx={6} fill={shade(color, 0.3)} />
    <circle cx={50} cy={82} r={9} fill={shade(color, -0.45)} />
    <rect x={46} y={84} width={8} height={18} rx={4} fill={shade(color, -0.45)} />
  </Shell>
);

/** Globe with meridians, slowly rotating. */
export const Globe: React.FC<IconProps> = ({ size = 180, color = C.blue, label }) => {
  const frame = useCurrentFrame();
  const t = (frame / 90) % 1;
  return (
    <Shell size={size} vb="0 0 100 100" label={label}>
      <circle cx={50} cy={50} r={48} fill={color} />
      <path d="M8 34 Q30 28 40 40 Q48 52 36 62 Q22 70 12 64 Z" fill={C.green} opacity={0.85} />
      <path d="M58 16 Q76 18 86 34 Q80 46 66 42 Q56 30 58 16 Z" fill={C.green} opacity={0.85} />
      <path d="M60 64 Q74 60 82 72 Q72 88 60 84 Z" fill={C.green} opacity={0.85} />
      {[0, 0.33, 0.66].map((o) => {
        const k = ((t + o) % 1) * 2 - 1;
        return <ellipse key={o} cx={50} cy={50} rx={Math.abs(k) * 48} ry={48} stroke={alpha(C.white, 0.35)} strokeWidth={2} fill="none" />;
      })}
      <path d="M2 50 L98 50" stroke={alpha(C.white, 0.35)} strokeWidth={2} />
      <circle cx={50} cy={50} r={48} fill="none" stroke={shade(color, -0.3)} strokeWidth={4} />
    </Shell>
  );
};

/** Spinning gear. */
export const Gear: React.FC<IconProps & { speed?: number }> = ({ size = 140, color = C.orange, label, speed = 1 }) => {
  const frame = useCurrentFrame();
  const teeth = 8;
  return (
    <Shell size={size} vb="-60 -60 120 120" label={label}>
      <g transform={`rotate(${frame * speed * 2})`}>
        {Array.from({ length: teeth }, (_, i) => (
          <rect key={i} x={-10} y={-58} width={20} height={24} rx={4} fill={color} transform={`rotate(${(360 / teeth) * i})`} />
        ))}
        <circle r={42} fill={color} />
        <circle r={42} fill="none" stroke={shade(color, -0.25)} strokeWidth={6} />
        <circle r={16} fill={C.night} />
      </g>
    </Shell>
  );
};

/** A queue: boxes in a tube, with the head about to leave. */
export const Queue: React.FC<IconProps & { items?: number }> = ({ size = 320, color = C.purple, label, items = 5 }) => {
  const frame = useCurrentFrame();
  const shift = ((frame % 45) / 45) * 36;
  return (
    <Shell size={size} vb="0 0 240 70" ratio={70 / 240} label={label}>
      <rect x={0} y={0} width={240} height={70} rx={35} fill={alpha(C.white, 0.08)} stroke={alpha(C.white, 0.25)} strokeWidth={3} />
      <clipPath id="q-clip">
        <rect x={6} y={6} width={228} height={58} rx={29} />
      </clipPath>
      <g clipPath="url(#q-clip)">
        {Array.from({ length: items + 1 }, (_, i) => (
          <rect key={i} x={20 + i * 36 + shift} y={17} width={28} height={36} rx={6} fill={shade(color, (i % 3) * 0.12)} />
        ))}
      </g>
    </Shell>
  );
};

/** Brain (for "the model", "learning"). */
export const Brain: React.FC<IconProps> = ({ size = 180, color = C.pink, label }) => (
  <Shell size={size} vb="0 0 120 100" ratio={100 / 120} label={label}>
    <path
      d="M60 10 Q40 0 28 12 Q10 12 10 32 Q0 44 8 58 Q4 76 22 84 Q30 98 48 92 Q56 98 60 92 Q64 98 72 92 Q90 98 98 84 Q116 76 112 58 Q120 44 110 32 Q110 12 92 12 Q80 0 60 10 Z"
      fill={color}
    />
    <path d="M60 12 L60 92" stroke={shade(color, -0.3)} strokeWidth={4} />
    <path d="M30 34 Q42 38 40 52 M24 62 Q38 60 44 72 M90 34 Q78 38 80 52 M96 62 Q82 60 76 72" stroke={shade(color, -0.3)} strokeWidth={4} fill="none" strokeLinecap="round" />
    <ellipse cx={34} cy={22} rx={12} ry={6} fill={shade(color, 0.35)} opacity={0.7} />
  </Shell>
);
