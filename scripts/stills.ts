// Render preview stills for a lesson so you can eyeball every scene without a full render.
//   npm run stills -- 12            → out/stills/L0012/*.jpg
// For each scene: one frame right after the last narration line starts (everything
// should be on screen), plus one mid-scene frame. Needs public/audio/L0012/timings.json.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { renderStill, selectComposition } from '@remotion/renderer';
import { sceneOffsets } from '../src/Lesson';
import { ROOT, lessonArg, makeBundle, pad, readTimings } from './lib';

const n = lessonArg();
const timings = readTimings(n);
const outDir = path.join(ROOT, 'out', 'stills', `L${pad(n)}`);
mkdirSync(outDir, { recursive: true });

const serveUrl = await makeBundle();
const inputProps = { lessonId: n };
const composition = await selectComposition({ serveUrl, id: 'Lesson', inputProps });

const shots: { name: string; frame: number }[] = [{ name: '00-title', frame: 60 }];
sceneOffsets(timings).forEach((s, i) => {
  const idx = String(i + 1).padStart(2, '0');
  shots.push({ name: `${idx}-${s.id}-a`, frame: Math.round(s.start + s.frames * 0.45) });
  shots.push({ name: `${idx}-${s.id}-b`, frame: Math.min(s.start + s.frames - 12, s.beats[s.beats.length - 1] + 45) });
});
shots.push({ name: '99-outro', frame: composition.durationInFrames - 30 });

for (const s of shots) {
  const output = path.join(outDir, `${s.name}.jpg`);
  await renderStill({ composition, serveUrl, output, frame: s.frame, inputProps, imageFormat: 'jpeg', jpegQuality: 70, scale: 0.5 });
  console.log(output);
}
