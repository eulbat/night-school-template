// Render the full lesson video.  npm run render -- 12  → out/L0012.mp4
import path from 'node:path';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { ROOT, lessonArg, makeBundle, pad } from './lib';

const n = lessonArg();
const serveUrl = await makeBundle();
const inputProps = { lessonId: n };
const composition = await selectComposition({ serveUrl, id: 'Lesson', inputProps });
const output = path.join(ROOT, 'out', `L${pad(n)}.mp4`);
let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  crf: 26,
  // Narration only: 128k AAC is transparent and keeps a ~5-minute lesson under the artifact's 20 MB upload limit.
  audioBitrate: '128k',
  outputLocation: output,
  inputProps,
  concurrency: Number(process.env.RENDER_CONCURRENCY) || null,
  onProgress: ({ progress }) => {
    const pct = Math.floor(progress * 10) * 10;
    if (pct !== last) {
      last = pct;
      console.log(`render ${pct}%`);
    }
  },
});
console.log(output);
