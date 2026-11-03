import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';

export const ROOT = path.resolve(import.meta.dirname, '..');

export const pad = (n: number) => String(n).padStart(4, '0');

export const lessonDir = (n: number) => {
  const d = readdirSync(path.join(ROOT, 'lessons')).find((f) => f.startsWith(`${pad(n)}-`));
  if (!d) throw new Error(`No lessons/${pad(n)}-* folder`);
  return path.join(ROOT, 'lessons', d);
};

export const readTimings = (n: number) => {
  const p = path.join(ROOT, 'public', 'audio', `L${pad(n)}`, 'timings.json');
  if (!existsSync(p)) throw new Error(`Missing ${p}. Run: python3 scripts/tts.py ${n} (or --estimate)`);
  return JSON.parse(readFileSync(p, 'utf8'));
};

export const makeBundle = () =>
  bundle({ entryPoint: path.join(ROOT, 'src', 'index.ts'), publicDir: path.join(ROOT, 'public') });

export const lessonArg = () => {
  const n = Number(process.argv[2]);
  if (!Number.isInteger(n) || n < 1) {
    console.error('usage: npm run <script> -- <lessonNumber>');
    process.exit(1);
  }
  return n;
};
