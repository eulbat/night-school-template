// Visual language: flat shapes, saturated accents on a deep night-blue
// background, two-tone shading (light rim on top, shadow underneath), soft glows.
import curriculum from '../../curriculum/curriculum.json';
import LANGUAGES from './languages.json';

export const W = 1920;
export const H = 1080;
export const FPS = 30;

export const C = {
  deep: '#0a0f2a',
  night: '#121a45',
  night2: '#1d2160',
  dusk: '#2b2a78',
  ink: '#0b1029',
  cream: '#f6f1e7',
  white: '#ffffff',
  mist: '#a9b4e8',
  dim: '#5d6aa8',
  orange: '#ff8a3d',
  yellow: '#ffd23f',
  teal: '#2ec4b6',
  pink: '#ff5d8f',
  purple: '#8a5cf6',
  blue: '#3fa7ff',
  green: '#7ed957',
  red: '#ff4b4b',
} as const;

/** Track colour schemes. A track picks one with `"color"` in curriculum.json. */
export const PALETTE = {
  purple: { color: C.purple, accent: C.pink, glow: '#6b3fd6' },
  teal: { color: C.teal, accent: C.yellow, glow: '#1b8f9e' },
  orange: { color: C.orange, accent: C.yellow, glow: '#c2552a' },
  blue: { color: C.blue, accent: C.green, glow: '#2a62c2' },
  pink: { color: C.pink, accent: C.yellow, glow: '#c23a6b' },
  green: { color: C.green, accent: C.blue, glow: '#3f8f2a' },
  yellow: { color: C.yellow, accent: C.orange, glow: '#b8901a' },
  red: { color: C.red, accent: C.yellow, glow: '#b82f2f' },
} as const;
export type TrackColor = keyof typeof PALETTE;

/** A track key from curriculum.json (`ai`, `history`…). */
export type Track = string;

type TrackDef = { name?: string; label: string; color?: string };
const tracks = curriculum.tracks as Record<string, TrackDef>;
const schemes = Object.values(PALETTE);

export const TRACKS: Record<Track, { label: string; color: string; accent: string; glow: string }> = Object.fromEntries(
  Object.entries(tracks).map(([key, t], i) => [
    key,
    { label: t.name ?? t.label, ...(PALETTE[t.color as TrackColor] ?? schemes[i % schemes.length]) },
  ]),
);

type Language = {
  name: string;
  /** A Google font for scripts Nunito lacks (Japanese, Chinese, Devanagari). */
  font?: string;
  ui: { lesson: string; prove: string[]; objectives: string; quiz: string };
};
/** The curriculum's language (src/kit/languages.json): the video's own words come from `ui`. */
export const LANG: Language =
  (LANGUAGES as Record<string, Language>)[(curriculum as { language?: string }).language ?? 'en'] ?? LANGUAGES.en;

const SCRIPT_FONTS: Record<string, string> = {
  NotoSansJP: 'Noto Sans JP',
  NotoSansSC: 'Noto Sans SC',
  NotoSansDevanagari: 'Noto Sans Devanagari',
};

export const FONT = {
  display: LANG.font ? `Nunito, '${SCRIPT_FONTS[LANG.font]}'` : 'Nunito',
  mono: 'JetBrains Mono',
};

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

/** Lighten (amt > 0) or darken (amt < 0) a hex colour. amt in [-1, 1]. */
export const shade = (hex: string, amt: number): string => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  return `#${[r, g, b].map((c) => clamp((t - c) * p + c).toString(16).padStart(2, '0')).join('')}`;
};

/** Mix two hex colours, t in [0, 1]. */
export const mix = (a: string, b: string, t: number): string => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  return `#${[16, 8, 0]
    .map((s) => clamp(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t).toString(16).padStart(2, '0'))
    .join('')}`;
};

export const alpha = (hex: string, a: number): string =>
  `${hex}${clamp(a * 255).toString(16).padStart(2, '0')}`;
