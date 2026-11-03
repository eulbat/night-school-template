import React from 'react';
import { Composition } from 'remotion';
import { loadFont as loadNunito } from '@remotion/google-fonts/Nunito';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { loadFont as loadDevanagari } from '@remotion/google-fonts/NotoSansDevanagari';
import { loadFont as loadJP } from '@remotion/google-fonts/NotoSansJP';
import { loadFont as loadSC } from '@remotion/google-fonts/NotoSansSC';
import { FPS, Lesson, LessonProps, calculateLessonMetadata } from './Lesson';
import { LANG } from './kit';
import { registry } from './lessons/registry';

loadNunito('normal', { weights: ['600', '700', '800', '900'], subsets: ['latin', 'latin-ext'] });
// Scripts Nunito doesn't cover: the curriculum's language picks one (src/kit/languages.json).
const SCRIPT_FONTS = { NotoSansDevanagari: loadDevanagari, NotoSansJP: loadJP, NotoSansSC: loadSC } as unknown as Record<
  string,
  (style: 'normal', options: { weights: string[] }) => unknown
>;
if (LANG.font) SCRIPT_FONTS[LANG.font]('normal', { weights: ['600', '700', '800', '900'] });
loadMono('normal', { weights: ['600', '700'], subsets: ['latin'] });

const latest = Math.max(1, ...Object.keys(registry).map(Number));

export const Root: React.FC = () => (
  <Composition<any, LessonProps>
    id="Lesson"
    component={Lesson}
    width={1920}
    height={1080}
    fps={FPS}
    durationInFrames={300}
    defaultProps={{ lessonId: latest, captions: true }}
    calculateMetadata={calculateLessonMetadata}
  />
);
