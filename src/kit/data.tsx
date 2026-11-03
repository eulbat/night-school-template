import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { C, FONT, alpha, mix, shade } from './theme';
import { progress } from './core';
import { Arrow, Traveler } from './shapes';

// ---------------------------------------------------------------------------
// Matrix: a grid of cells (weights, attention maps, tables, memory, pixels).
// Place inside <Abs>.
// ---------------------------------------------------------------------------

export const Matrix: React.FC<{
  rows: number;
  cols: number;
  /** values[r][c]: shown as text. Optional. */
  values?: (string | number)[][];
  /** heat[r][c] in [0,1]: colours the cell from `cold` to `hot`. Optional. */
  heat?: number[][];
  cell?: number;
  gap?: number;
  at?: number;
  /** Frames between cell reveals. 0 = all at once. */
  step?: number;
  hot?: string;
  cold?: string;
  /** Cells to highlight with a pulsing outline: [[r, c], ...]. */
  highlight?: [number, number][];
  highlightAt?: number;
  rowLabels?: string[];
  colLabels?: string[];
  fontSize?: number;
}> = ({
  rows,
  cols,
  values,
  heat,
  cell = 90,
  gap = 10,
  at = 0,
  step = 1.5,
  hot = C.pink,
  cold = C.night2,
  highlight = [],
  highlightAt = 0,
  rowLabels,
  colLabels,
  fontSize,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fs = fontSize ?? cell * 0.32;
  const hl = new Set(highlight.map(([r, c]) => `${r},${c}`));
  const pulse = 1 + Math.sin((frame - highlightAt) / 4) * 0.06;
  const labelW = rowLabels ? cell * 1.6 : 0;
  return (
    <div style={{ position: 'relative', paddingLeft: labelW, paddingTop: colLabels ? fs * 1.8 : 0 }}>
      {colLabels?.map((l, c) => (
        <div
          key={`cl${c}`}
          style={{
            position: 'absolute',
            top: 0,
            left: labelW + c * (cell + gap),
            width: cell,
            textAlign: 'center',
            fontFamily: FONT.display,
            fontWeight: 800,
            fontSize: fs,
            color: C.mist,
            opacity: progress(frame, at, at + 10),
          }}
        >
          {l}
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap }}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const s = spring({ frame: frame - at - i * step, fps, config: { damping: 12, stiffness: 200, mass: 0.5 } });
          const h = heat?.[r]?.[c];
          const bg = h !== undefined ? mix(cold, hot, Math.max(0, Math.min(1, h))) : cold;
          const isHl = hl.has(`${r},${c}`) && frame >= highlightAt;
          return (
            <div
              key={i}
              style={{
                width: cell,
                height: cell,
                borderRadius: cell * 0.18,
                background: bg,
                transform: `scale(${s * (isHl ? pulse : 1)})`,
                boxShadow: `inset 0 4px 0 ${alpha('#ffffff', 0.14)}, inset 0 -5px 0 ${alpha('#000000', 0.2)}${isHl ? `, 0 0 0 5px ${C.yellow}` : ''}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONT.mono,
                fontWeight: 700,
                fontSize: fs,
                color: h !== undefined && h > 0.55 ? C.ink : C.cream,
              }}
            >
              {values?.[r]?.[c] ?? ''}
            </div>
          );
        })}
      </div>
      {rowLabels?.map((l, r) => (
        <div
          key={`rl${r}`}
          style={{
            position: 'absolute',
            left: 0,
            top: (colLabels ? fs * 1.8 : 0) + r * (cell + gap),
            width: labelW - gap,
            height: cell,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            fontFamily: FONT.display,
            fontWeight: 800,
            fontSize: fs,
            color: C.mist,
            opacity: progress(frame, at, at + 10),
          }}
        >
          {l}
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Bars: animated bar chart. Place inside <Abs>.
// ---------------------------------------------------------------------------

export const Bars: React.FC<{
  values: number[];
  labels?: string[];
  max?: number;
  colors?: string[];
  width?: number;
  height?: number;
  at?: number;
  step?: number;
  showValues?: boolean;
  format?: (v: number) => string;
}> = ({
  values,
  labels,
  max,
  colors = [C.teal, C.pink, C.yellow, C.orange, C.purple, C.blue],
  width = 900,
  height = 500,
  at = 0,
  step = 5,
  showValues = true,
  format = (v) => `${Math.round(v)}`,
}) => {
  const frame = useCurrentFrame();
  const m = max ?? Math.max(...values, 1);
  const bw = (width / values.length) * 0.66;
  return (
    <div style={{ width, height: height + 60, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: height, height: 6, borderRadius: 3, background: alpha(C.cream, 0.5) }} />
      {values.map((v, i) => {
        const p = progress(frame, at + i * step, at + i * step + 24);
        const bh = (v / m) * height * p;
        const x = (i + 0.5) * (width / values.length) - bw / 2;
        const color = colors[i % colors.length];
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: x,
                top: height - bh,
                width: bw,
                height: bh,
                borderRadius: '14px 14px 4px 4px',
                background: `linear-gradient(90deg, ${color} 0%, ${color} 70%, ${shade(color, -0.18)} 70%)`,
                boxShadow: `inset 0 6px 0 ${alpha('#ffffff', 0.25)}`,
              }}
            />
            {showValues && p > 0.2 ? (
              <div
                style={{
                  position: 'absolute',
                  left: x - 40,
                  width: bw + 80,
                  top: height - bh - 52,
                  textAlign: 'center',
                  fontFamily: FONT.display,
                  fontWeight: 900,
                  fontSize: 38,
                  color: C.cream,
                }}
              >
                {format(v * p)}
              </div>
            ) : null}
            {labels?.[i] ? (
              <div
                style={{
                  position: 'absolute',
                  left: x - 60,
                  width: bw + 120,
                  top: height + 16,
                  textAlign: 'center',
                  fontFamily: FONT.display,
                  fontWeight: 800,
                  fontSize: 30,
                  color: C.mist,
                }}
              >
                {labels[i]}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Graph: nodes + edges in stage coordinates (neural nets, service maps,
// dependency graphs, state machines). Render directly in the scene.
// ---------------------------------------------------------------------------

export type GNode = { id: string; x: number; y: number; label?: string; color?: string; r?: number; sub?: string };
export type GEdge = { from: string; to: string; color?: string; width?: number; bend?: number; label?: string; pulse?: boolean };

export const Graph: React.FC<{
  nodes: GNode[];
  edges?: GEdge[];
  at?: number;
  /** Frames between node pops. */
  step?: number;
  /** When edges start drawing (default: after nodes). */
  edgesAt?: number;
  /** Send dots along all edges (or only those with pulse: true) from this frame. */
  pulsesAt?: number;
  directed?: boolean;
  nodeColor?: string;
  edgeColor?: string;
  r?: number;
  /** Node ids to light up from frame `activeAt`. */
  active?: string[];
  activeAt?: number;
}> = ({
  nodes,
  edges = [],
  at = 0,
  step = 3,
  edgesAt,
  pulsesAt,
  directed = true,
  nodeColor = C.teal,
  edgeColor = alpha(C.cream, 0.55),
  r = 44,
  active = [],
  activeAt = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const eAt = edgesAt ?? at + nodes.length * step + 6;
  const anyPulseFlag = edges.some((e) => e.pulse);
  return (
    <>
      {edges.map((e, i) => {
        const a = byId[e.from];
        const b = byId[e.to];
        if (!a || !b) return null;
        const ra = a.r ?? r;
        const rb = b.r ?? r;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const from: [number, number] = [a.x + (dx / len) * (ra + 6), a.y + (dy / len) * (ra + 6)];
        const to: [number, number] = [b.x - (dx / len) * (rb + 8), b.y - (dy / len) * (rb + 8)];
        const showPulse = pulsesAt !== undefined && (anyPulseFlag ? e.pulse : true);
        return (
          <React.Fragment key={`e${i}`}>
            <Arrow
              from={from}
              to={to}
              bend={e.bend ?? 0}
              at={eAt + i * 1.5}
              dur={14}
              color={e.color ?? edgeColor}
              width={e.width ?? 5}
              head={directed}
              label={e.label}
            />
            {showPulse ? (
              <Traveler from={from} to={to} bend={e.bend ?? 0} at={pulsesAt! + (i % 5) * 4} period={36} color={C.yellow} r={8} />
            ) : null}
          </React.Fragment>
        );
      })}
      {nodes.map((n, i) => {
        const s = spring({ frame: frame - at - i * step, fps, config: { damping: 11, stiffness: 170, mass: 0.6 } });
        const nr = n.r ?? r;
        const isActive = active.includes(n.id) && frame >= activeAt;
        const color = isActive ? C.yellow : n.color ?? nodeColor;
        const glow = isActive ? interpolate(Math.sin(frame / 5), [-1, 1], [0.3, 0.7]) : 0;
        return (
          <div
            key={n.id}
            style={{
              position: 'absolute',
              left: n.x - nr,
              top: n.y - nr,
              width: nr * 2,
              height: nr * 2,
              transform: `scale(${s})`,
            }}
          >
            {isActive ? (
              <div
                style={{
                  position: 'absolute',
                  inset: -nr * 0.7,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${alpha(C.yellow, glow)} 0%, ${alpha(C.yellow, 0)} 70%)`,
                }}
              />
            ) : null}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 30%, ${shade(color, 0.35)} 0%, ${color} 55%, ${shade(color, -0.25)} 100%)`,
                boxShadow: `0 10px 20px ${alpha('#000000', 0.3)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONT.display,
                fontWeight: 900,
                fontSize: nr * 0.62,
                color: C.ink,
              }}
            >
              {n.label}
            </div>
            {n.sub ? (
              <div
                style={{
                  position: 'absolute',
                  top: nr * 2 + 8,
                  left: -100,
                  width: nr * 2 + 200,
                  textAlign: 'center',
                  fontFamily: FONT.display,
                  fontWeight: 800,
                  fontSize: 28,
                  color: C.cream,
                }}
              >
                {n.sub}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
};

/** Helper: lay out a layered network (e.g. a neural net) and return nodes + all-to-all edges. */
export const layered = (
  layers: number[],
  opts: { x0?: number; x1?: number; cy?: number; gapY?: number; prefix?: string; colors?: string[] } = {},
): { nodes: GNode[]; edges: GEdge[] } => {
  const { x0 = 560, x1 = 1360, cy = 540, gapY = 150, prefix = 'n', colors = [C.teal, C.purple, C.pink, C.yellow] } = opts;
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];
  layers.forEach((count, li) => {
    const x = layers.length === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * li) / (layers.length - 1);
    for (let k = 0; k < count; k++) {
      nodes.push({ id: `${prefix}${li}_${k}`, x, y: cy + (k - (count - 1) / 2) * gapY, color: colors[li % colors.length] });
    }
  });
  layers.forEach((count, li) => {
    if (li === layers.length - 1) return;
    for (let a = 0; a < count; a++)
      for (let b = 0; b < layers[li + 1]; b++) edges.push({ from: `${prefix}${li}_${a}`, to: `${prefix}${li + 1}_${b}`, width: 3 });
  });
  return { nodes, edges };
};

// ---------------------------------------------------------------------------
// Counter: a number that counts between two values.
// ---------------------------------------------------------------------------

export const Counter: React.FC<{
  from?: number;
  to: number;
  at?: number;
  dur?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  size?: number;
  color?: string;
  /** Format big numbers with thin spaces (1 000 000). */
  group?: boolean;
}> = ({ from = 0, to, at = 0, dur = 40, decimals = 0, prefix = '', suffix = '', size = 120, color = C.yellow, group = true }) => {
  const frame = useCurrentFrame();
  const v = from + (to - from) * progress(frame, at, at + dur);
  const fixed = v.toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const intFmt = group ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : int;
  return (
    <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: size, color, letterSpacing: -2, whiteSpace: 'nowrap' }}>
      {prefix}
      {intFmt}
      {dec ? `.${dec}` : ''}
      {suffix}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Plot: axes + scatter points + optional line y = w·x + b (or any fn).
// Pass w/b computed from the frame to animate the fit. Place inside <Abs>.
// ---------------------------------------------------------------------------

export const Plot: React.FC<{
  width?: number;
  height?: number;
  x?: [number, number];
  y?: [number, number];
  points?: [number, number][];
  /** Curve to draw: either a line {w, b} or any function. */
  line?: { w: number; b: number } | ((x: number) => number);
  lineColor?: string;
  /** Draw error bars from each point to the line. */
  residuals?: boolean;
  at?: number;
  xLabel?: string;
  yLabel?: string;
  pointColor?: string;
}> = ({
  width = 900,
  height = 600,
  x = [0, 10],
  y = [0, 10],
  points = [],
  line,
  lineColor = C.yellow,
  residuals,
  at = 0,
  xLabel,
  yLabel,
  pointColor = C.teal,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sx = (v: number) => ((v - x[0]) / (x[1] - x[0])) * width;
  const sy = (v: number) => height - ((v - y[0]) / (y[1] - y[0])) * height;
  const f = typeof line === 'function' ? line : line ? (v: number) => line.w * v + line.b : null;
  const axisP = progress(frame, at, at + 16);
  const curve = f
    ? Array.from({ length: 41 }, (_, i) => {
        const xv = x[0] + ((x[1] - x[0]) * i) / 40;
        return `${i ? 'L' : 'M'} ${sx(xv)} ${sy(f(xv))}`;
      }).join(' ')
    : '';
  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <clipPath id="plot-clip">
            <rect x={0} y={-10} width={width + 10} height={height + 10} />
          </clipPath>
        </defs>
        <path d={`M 0 ${height} L ${width * axisP} ${height}`} stroke={C.cream} strokeWidth={6} strokeLinecap="round" />
        <path d={`M 0 ${height} L 0 ${height - height * axisP}`} stroke={C.cream} strokeWidth={6} strokeLinecap="round" />
        <g clipPath="url(#plot-clip)">
          {f && residuals
            ? points.map(([px, py], i) => (
                <line key={`r${i}`} x1={sx(px)} y1={sy(py)} x2={sx(px)} y2={sy(f(px))} stroke={C.pink} strokeWidth={4} strokeDasharray="8 7" opacity={0.9} />
              ))
            : null}
          {f ? <path d={curve} stroke={lineColor} strokeWidth={8} fill="none" strokeLinecap="round" /> : null}
        </g>
        {points.map(([px, py], i) => {
          const s = spring({ frame: frame - at - 10 - i * 2, fps, config: { damping: 10, stiffness: 180, mass: 0.5 } });
          return (
            <g key={i} transform={`translate(${sx(px)} ${sy(py)}) scale(${s})`}>
              <circle r={15} fill={pointColor} />
              <circle r={15} fill="none" stroke={shade(pointColor, -0.3)} strokeWidth={4} />
              <circle cx={-4} cy={-5} r={4} fill={shade(pointColor, 0.5)} />
            </g>
          );
        })}
      </svg>
      {xLabel ? (
        <div style={{ position: 'absolute', right: 0, top: height + 18, fontFamily: FONT.display, fontWeight: 800, fontSize: 34, color: C.mist, opacity: axisP }}>
          {xLabel}
        </div>
      ) : null}
      {yLabel ? (
        <div style={{ position: 'absolute', left: 0, top: -58, fontFamily: FONT.display, fontWeight: 800, fontSize: 34, color: C.mist, opacity: axisP }}>
          {yLabel}
        </div>
      ) : null}
    </div>
  );
};
