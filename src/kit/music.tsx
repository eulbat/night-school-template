import React, { useContext } from 'react';
import { useCurrentFrame } from 'remotion';
import { NoteEvent, SceneContext, progress } from './core';
import { C, FONT, alpha } from './theme';

// ---------------------------------------------------------------------------
// Music: lines in lesson.json with "notes" are synthesized by scripts/tts.py and play in
// the video (see the nightly-lesson skill). These helpers show those notes as they sound.
// ---------------------------------------------------------------------------

/** The notes played by narration line `i` of this scene, in scene frames ([] for a spoken line). */
export const useNotes = (i: number): NoteEvent[] => useContext(SceneContext).notes?.[i] ?? [];

const SHARPS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLATS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

/** MIDI number → note name: 70 → "B♭4" (or "A♯4" with flats=false). octave=false drops the number. */
export const noteName = (midi: number, { flats = true, octave = true } = {}) =>
  (flats ? FLATS : SHARPS)[((midi % 12) + 12) % 12] + (octave ? String(Math.floor(midi / 12) - 1) : '');

type PianoRollProps = {
  /** Index of the music line (as in useBeats) whose notes to draw. */
  line: number;
  /** Centre of the roll on the stage. */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  /** Show note names on the bars. */
  labels?: boolean;
  /** Pitch range shown (MIDI); defaults to the notes' range plus a little room. */
  low?: number;
  high?: number;
};

/**
 * A piano roll for a music line: one bar per note (time left→right, pitch bottom→top) that
 * lights up while it sounds, with a playhead. Bars are visible (dim) from the start so the
 * viewer sees the shape of the melody, then fill in as it plays.
 * `<PianoRoll line={2} />` under a lesson.json line 3 of {"text": "♪ …", "notes": "C4:1 G4:2"}.
 */
export const PianoRoll: React.FC<PianoRollProps> = ({ line, x = 960, y = 470, width = 1300, height = 440, color = C.yellow, labels = true, low, high }) => {
  const frame = useCurrentFrame();
  const notes = useNotes(line);
  if (!notes.length) return null;
  const pitches = notes.flatMap((n) => n.midi);
  const lo = low ?? Math.min(...pitches) - 1;
  const hi = high ?? Math.max(...pitches) + 1;
  const t0 = notes[0].at;
  const t1 = Math.max(...notes.map((n) => n.at + n.frames));
  const px = (f: number) => ((f - t0) / Math.max(1, t1 - t0)) * width;
  const rowH = height / (hi - lo + 1);
  const py = (m: number) => (hi - m) * rowH;
  const head = Math.min(width, Math.max(0, px(frame)));
  const playing = frame >= t0 && frame <= t1 + 6;
  return (
    <div style={{ position: 'absolute', left: x - width / 2, top: y - height / 2, width, height }}>
      {/* octave guides: a faint line at every C */}
      {Array.from({ length: hi - lo + 1 }, (_, k) => hi - k)
        .filter((m) => m % 12 === 0)
        .map((m) => (
          <div key={m} style={{ position: 'absolute', left: 0, right: 0, top: py(m) + rowH, height: 2, background: alpha(C.mist, 0.18) }} />
        ))}
      {notes.flatMap((n, i) =>
        n.midi.map((m) => {
          const on = frame >= n.at && frame < n.at + n.frames + 4;
          const lit = progress(frame, n.at - 1, n.at + 3);
          const w = Math.max(rowH * 0.9, px(n.at + n.frames) - px(n.at) - 6);
          const barH = Math.max(18, rowH - 4);
          // short notes put a shorter name (no octave) under the bar, so neighbours' names don't collide
          const below = w < 90;
          return (
            <div
              key={`${i}-${m}`}
              style={{
                position: 'absolute',
                left: px(n.at),
                top: py(m) + rowH / 2 - barH / 2,
                width: w,
                height: barH,
                borderRadius: Math.min(14, barH / 2),
                background: alpha(color, 0.18 + 0.82 * lit),
                border: `3px solid ${alpha(color, 0.5 + 0.5 * lit)}`,
                boxShadow: on ? `0 0 28px ${alpha(color, 0.75)}` : 'none',
                transform: `scale(${on ? 1.06 : 1})`,
              }}
            >
              {labels ? (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    ...(below ? { top: '100%', marginTop: 6 } : { bottom: '100%', marginBottom: 6 }),
                    fontFamily: FONT.display,
                    fontWeight: 800,
                    fontSize: below ? 24 : 28,
                    color: on ? C.white : alpha(C.cream, 0.55 + 0.3 * lit),
                    whiteSpace: 'nowrap',
                  }}
                >
                  {noteName(m, { octave: !below })}
                </div>
              ) : null}
            </div>
          );
        }),
      )}
      {playing ? <div style={{ position: 'absolute', left: head - 2, top: -20, width: 4, height: height + 40, borderRadius: 2, background: alpha(C.cream, 0.7) }} /> : null}
    </div>
  );
};
