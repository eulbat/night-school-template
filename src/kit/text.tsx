import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, FONT, alpha, shade } from './theme';
import { progress } from './core';

// On-screen text should be SHORT: a word, a label, a formula. The narration
// carries the explanation; text on screen is an anchor, never a paragraph.

const shadow = `0 6px 0 ${alpha('#000000', 0.25)}`;

export const Headline: React.FC<{ children: React.ReactNode; size?: number; color?: string; align?: 'center' | 'left'; width?: number }> = ({
  children,
  size = 96,
  color = C.cream,
  align = 'center',
  width,
}) => (
  <div
    style={{
      fontFamily: FONT.display,
      fontWeight: 900,
      fontSize: size,
      lineHeight: 1.05,
      letterSpacing: -1.5,
      color,
      textAlign: align,
      textShadow: shadow,
      width,
    }}
  >
    {children}
  </div>
);

export const Label: React.FC<{ children: React.ReactNode; size?: number; color?: string; weight?: number; width?: number; align?: 'center' | 'left' | 'right' }> = ({
  children,
  size = 44,
  color = C.cream,
  weight = 800,
  width,
  align = 'center',
}) => (
  <div style={{ fontFamily: FONT.display, fontWeight: weight, fontSize: size, color, lineHeight: 1.2, width, textAlign: align }}>
    {children}
  </div>
);

/** Inline emphasis inside Headline/Label. */
export const Em: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.yellow }) => (
  <span style={{ color }}>{children}</span>
);

/** Text that types itself on. */
export const Typewriter: React.FC<{ text: string; at?: number; cps?: number; size?: number; color?: string; mono?: boolean }> = ({
  text,
  at = 0,
  cps = 30,
  size = 48,
  color = C.cream,
  mono,
}) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.floor(((frame - at) / 30) * cps));
  const caret = frame >= at && n < text.length && Math.floor(frame / 8) % 2 === 0;
  return (
    <div style={{ fontFamily: mono ? FONT.mono : FONT.display, fontWeight: mono ? 600 : 800, fontSize: size, color, whiteSpace: 'pre-wrap' }}>
      {text.slice(0, n)}
      <span style={{ opacity: caret ? 1 : 0 }}>▌</span>
    </div>
  );
};

/**
 * A code panel. Lines reveal one by one from `at` (every `step` frames).
 * `highlight` = line indexes (0-based) to emphasise from `highlightAt`.
 */
export const CodeBlock: React.FC<{
  code: string;
  at?: number;
  step?: number;
  size?: number;
  width?: number;
  highlight?: number[];
  highlightAt?: number;
  title?: string;
}> = ({ code, at = 0, step = 6, size = 34, width, highlight = [], highlightAt = 0, title }) => {
  const frame = useCurrentFrame();
  const lines = code.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
  return (
    <div
      style={{
        width,
        background: shade(C.deep, 0.02),
        borderRadius: 24,
        padding: '22px 34px 28px',
        boxShadow: `inset 0 5px 0 ${alpha('#ffffff', 0.08)}, 0 24px 48px ${alpha('#000000', 0.4)}`,
        fontFamily: FONT.mono,
        fontSize: size,
        color: C.cream,
      }}
    >
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        {[C.red, C.yellow, C.green].map((c) => (
          <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
        ))}
        {title ? <div style={{ marginLeft: 14, fontSize: size * 0.7, color: C.dim, fontWeight: 700 }}>{title}</div> : null}
      </div>
      {lines.map((l, i) => {
        const p = progress(frame, at + i * step, at + i * step + 8);
        const hl = highlight.includes(i) && frame >= highlightAt;
        return (
          <div
            key={i}
            style={{
              opacity: p,
              transform: `translateX(${(1 - p) * 20}px)`,
              whiteSpace: 'pre',
              lineHeight: 1.5,
              borderRadius: 8,
              padding: '0 10px',
              margin: '0 -10px',
              background: hl ? alpha(C.yellow, 0.18) : 'transparent',
              color: l.trim().startsWith('#') || l.trim().startsWith('//') ? C.dim : C.cream,
            }}
          >
            {l || ' '}
          </div>
        );
      })}
    </div>
  );
};

/** Bulleted list where items appear on given frames (e.g. beats). Keep items to a few words. */
export const List: React.FC<{ items: string[]; at: number[] | number; size?: number; color?: string; bullet?: string; width?: number }> = ({
  items,
  at,
  size = 46,
  color = C.cream,
  bullet = C.yellow,
  width,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: size * 0.5, width }}>
      {items.map((it, i) => {
        const a = Array.isArray(at) ? at[i] ?? at[at.length - 1] : at + i * 12;
        const p = progress(frame, a, a + 14);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: size * 0.45, opacity: p, transform: `translateX(${(1 - p) * -30}px)` }}>
            <div style={{ width: size * 0.42, height: size * 0.42, borderRadius: '50%', background: bullet, flexShrink: 0 }} />
            <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: size, color, lineHeight: 1.15 }}>{it}</div>
          </div>
        );
      })}
    </div>
  );
};
