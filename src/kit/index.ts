// The animation kit. Lessons import everything from here:
//   import { defineLesson, useBeats, Abs, Pop, Bit, ... } from '../kit';

import type React from 'react';

export * from './theme';
export * from './core';
export * from './shapes';
export * from './characters';
export * from './icons';
export * from './data';
export * from './text';
export { Backdrop, Ground } from './backdrop';

export { useCurrentFrame, interpolate, spring, random, Easing, AbsoluteFill, Sequence } from 'remotion';

/** Map of scene id (from lesson.json) to the component that draws it. */
export type LessonVisuals = Record<string, React.FC>;

export const defineLesson = (visuals: LessonVisuals): LessonVisuals => visuals;
