import React from 'react';
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Html5Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { registry } from './lessons/registry';
import {
  Abs,
  Backdrop,
  Bit,
  C,
  FONT,
  LANG,
  List,
  Pop,
  SceneContext,
  Sfx,
  Slide,
  TRACKS,
  Token,
  Track,
  alpha,
  progress,
} from './kit';

export const FPS = 30;
const TITLE_FRAMES = 110;
const OUTRO_FRAMES = 200;
/** Frames of silence before narration starts in each scene. */
const LEAD = 8;
/** Seconds of breathing room after the narration of each scene. */
const TAIL = 0.55;

export type Timings = {
  lesson: number;
  title: string;
  subtitle: string;
  track: Track;
  objectives: string[];
  scenes: { id: string; file: string | null; duration: number; lines: { text: string; start: number; end: number }[] }[];
};

export type LessonProps = { lessonId: number; timings?: Timings; captions?: boolean };

const sceneFrames = (s: Timings['scenes'][number]) => LEAD + Math.ceil((s.duration + TAIL) * FPS);

export const lessonDuration = (t: Timings) => TITLE_FRAMES + t.scenes.reduce((a, s) => a + sceneFrames(s), 0) + OUTRO_FRAMES;

/** Start frame of every scene, plus title/outro, for chapters & stills. */
export const sceneOffsets = (t: Timings) => {
  let f = TITLE_FRAMES;
  return t.scenes.map((s) => {
    const start = f;
    f += sceneFrames(s);
    return { id: s.id, start, frames: sceneFrames(s), beats: s.lines.map((l) => start + LEAD + Math.round(l.start * FPS)) };
  });
};

export const calculateLessonMetadata: CalculateMetadataFunction<LessonProps> = async ({ props }) => {
  const id = String(props.lessonId).padStart(4, '0');
  const res = await fetch(staticFile(`audio/L${id}/timings.json`));
  if (!res.ok) throw new Error(`No timings for lesson ${id}. Run: python3 scripts/tts.py ${props.lessonId}`);
  const timings = (await res.json()) as Timings;
  return { durationInFrames: lessonDuration(timings), props: { ...props, timings } };
};

const SceneShell: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  const inP = progress(frame, 0, 12);
  const outP = progress(frame, frames - 10, frames);
  const zoom = interpolate(frame, [0, frames], [1, 1.035]);
  return (
    <AbsoluteFill
      style={{
        opacity: inP * (1 - outP),
        transform: `scale(${zoom * (0.97 + 0.03 * inP)})`,
        fontFamily: FONT.display,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ lines: Timings['scenes'][number]['lines'] }> = ({ lines }) => {
  const frame = useCurrentFrame();
  const t = (frame - LEAD) / FPS;
  const cur = lines.find((l) => t >= l.start - 0.05 && t <= l.end + 0.25);
  if (!cur) return null;
  const p = progress(frame, LEAD + cur.start * FPS - 2, LEAD + cur.start * FPS + 5);
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 46 }}>
      <div
        style={{
          maxWidth: 1500,
          padding: '12px 28px',
          borderRadius: 18,
          background: alpha(C.deep, 0.72),
          color: C.cream,
          fontFamily: FONT.display,
          fontWeight: 700,
          fontSize: 38,
          lineHeight: 1.25,
          textAlign: 'center',
          opacity: p,
        }}
      >
        {cur.text}
      </div>
    </AbsoluteFill>
  );
};

const TitleCard: React.FC<{ t: Timings }> = ({ t }) => {
  const frame = useCurrentFrame();
  const tr = TRACKS[t.track];
  const out = progress(frame, TITLE_FRAMES - 14, TITLE_FRAMES);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <Sfx at={4} name="whoosh" volume={0.3} />
      <Sfx at={22} name="ding" volume={0.25} />
      <Abs x={960} y={300}>
        <Pop at={4}>
          <Token text={`${tr.label.toUpperCase()}  ·  ${LANG.ui.lesson.replace('{n}', String(t.lesson))}`} color={tr.color} textColor={C.white} size={34} />
        </Pop>
      </Abs>
      <Abs x={960} y={470}>
        <Slide at={12} from="up" dist={40}>
          <div
            style={{
              fontFamily: FONT.display,
              fontWeight: 900,
              fontSize: t.title.length > 34 ? 92 : 112,
              color: C.cream,
              textAlign: 'center',
              width: 1600,
              lineHeight: 1.02,
              letterSpacing: -2,
              textShadow: `0 8px 0 ${alpha('#000000', 0.25)}`,
            }}
          >
            {t.title}
          </div>
        </Slide>
      </Abs>
      <Abs x={960} y={620}>
        <Slide at={22} from="up" dist={30}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 46, color: C.mist, textAlign: 'center', width: 1500 }}>
            {t.subtitle}
          </div>
        </Slide>
      </Abs>
      <Abs x={960} y={850}>
        <Pop at={30}>
          <Bit size={170} color={tr.accent} mood="happy" look={[0, -0.6]} seed={3} />
        </Pop>
      </Abs>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ t: Timings }> = ({ t }) => {
  const tr = TRACKS[t.track];
  return (
    <AbsoluteFill>
      <Sfx at={6} name="swell" volume={0.25} />
      <Abs x={960} y={170}>
        <Slide at={4} from="up">
          <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: 84, color: C.cream, letterSpacing: -1, whiteSpace: 'nowrap' }}>
            {LANG.ui.prove[0]}
            <span style={{ color: tr.accent }}>{LANG.ui.prove[1]}</span>
          </div>
        </Slide>
      </Abs>
      <Abs x={960} y={500}>
        <Pop at={14}>
          <div
            style={{
              background: alpha(C.night2, 0.85),
              borderRadius: 32,
              padding: '40px 56px',
              boxShadow: `inset 0 6px 0 ${alpha('#ffffff', 0.12)}, 0 24px 48px ${alpha('#000000', 0.35)}`,
            }}
          >
            <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 36, color: C.mist, marginBottom: 26 }}>
              {LANG.ui.objectives}
            </div>
            <List items={t.objectives.slice(0, 4)} at={24} size={40} bullet={tr.accent} width={1300} />
          </div>
        </Pop>
      </Abs>
      <Abs x={960} y={880}>
        <Slide at={60} from="down">
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <Bit size={130} color={tr.accent} mood="grin" seed={9} />
            <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: 46, color: C.cream, whiteSpace: 'nowrap' }}>
              {LANG.ui.quiz}{' '}
              <span style={{ fontFamily: FONT.mono, color: C.yellow }}>/today</span>
            </div>
          </div>
        </Slide>
      </Abs>
    </AbsoluteFill>
  );
};

const Missing: React.FC<{ id: string }> = ({ id }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', color: C.red, fontSize: 60, fontFamily: FONT.display }}>
    Missing visual for scene “{id}”
  </AbsoluteFill>
);

export const Lesson: React.FC<LessonProps> = ({ lessonId, timings, captions = true }) => {
  const frame = useCurrentFrame();
  if (!timings) return null;
  const visuals = registry[lessonId] ?? {};
  const tr = TRACKS[timings.track];
  const total = lessonDuration(timings);
  const offsets = sceneOffsets(timings);
  const musicVol = interpolate(frame, [0, 30, total - 60, total], [0, 0.11, 0.11, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ background: C.deep }}>
      <Backdrop glow={tr.glow} />
      <Html5Audio src={staticFile('music/ambient.wav')} volume={musicVol} loop />
      <Sequence durationInFrames={TITLE_FRAMES}>
        <TitleCard t={timings} />
      </Sequence>
      {timings.scenes.map((s, i) => {
        const o = offsets[i];
        const Visual = visuals[s.id];
        const beats = s.lines.map((l) => LEAD + Math.round(l.start * FPS));
        const beatEnds = s.lines.map((l) => LEAD + Math.round(l.end * FPS));
        return (
          <Sequence key={s.id} from={o.start} durationInFrames={o.frames} name={s.id}>
            <SceneContext.Provider value={{ beats, beatEnds, duration: o.frames }}>
              <SceneShell frames={o.frames}>{Visual ? <Visual /> : <Missing id={s.id} />}</SceneShell>
              {captions ? <Caption lines={s.lines} /> : null}
            </SceneContext.Provider>
            {s.file ? (
              <Sequence from={LEAD} layout="none">
                <Html5Audio src={staticFile(s.file)} />
              </Sequence>
            ) : null}
          </Sequence>
        );
      })}
      <Sequence from={total - OUTRO_FRAMES} durationInFrames={OUTRO_FRAMES}>
        <Outro t={timings} />
      </Sequence>
    </AbsoluteFill>
  );
};
