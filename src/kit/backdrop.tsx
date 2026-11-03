import React from 'react';
import { AbsoluteFill, random, useCurrentFrame } from 'remotion';
import { C, alpha, mix } from './theme';

/**
 * Persistent starry night background. Rendered once behind every scene by the
 * Lesson composition. Scenes can add their own scenery on top (e.g. <Ground/>).
 */
export const Backdrop: React.FC<{ glow?: string; stars?: number }> = ({ glow = C.purple, stars = 90 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.deep} 0%, ${C.night} 55%, ${mix(C.night2, glow, 0.15)} 100%)` }}>
      <div
        style={{
          position: 'absolute',
          left: 960 - 900 + Math.sin(frame / 200) * 60,
          top: 700 - 700,
          width: 1800,
          height: 1400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(glow, 0.22)} 0%, ${alpha(glow, 0)} 65%)`,
        }}
      />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: stars }, (_, i) => {
          const x = (random(`sx${i}`) * 2000 + frame * (0.05 + random(`sv${i}`) * 0.15)) % 2000 - 40;
          const y = random(`sy${i}`) * 1080;
          const r = 1 + random(`sr${i}`) * 2.6;
          const tw = 0.35 + 0.65 * Math.abs(Math.sin(frame / (18 + random(`st${i}`) * 40) + i));
          return <circle key={i} cx={x} cy={y} r={r} fill={C.white} opacity={tw * (0.3 + random(`so${i}`) * 0.5)} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** A rounded planet-surface ground at the bottom of the frame for characters to stand on. */
export const Ground: React.FC<{ color?: string; y?: number }> = ({ color = C.dusk, y = 900 }) => (
  <div
    style={{
      position: 'absolute',
      left: -600,
      top: y,
      width: 3120,
      height: 2400,
      borderRadius: '50%',
      background: `radial-gradient(ellipse at 50% 0%, ${mix(color, '#ffffff', 0.12)} 0%, ${color} 18%, ${mix(color, '#000000', 0.35)} 40%)`,
      boxShadow: `0 -10px 60px ${alpha(color, 0.5)}`,
    }}
  />
);
