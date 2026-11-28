// START_MODULE_CONTRACT
// PURPOSE: Verify contrast of built-in chart label and bar-edge defaults over arbitrary task colors.
// SCOPE: Plain in-bar label styling and conditional bar-boundary contrast.
// INPUTS: In-bar CSS rules and representative sRGB task and canvas colors.
// OUTPUTS: Regression evidence for plain labels and boundary contrast without changing task colors.
// END_MODULE_CONTRACT
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { darkBarLabelStyle, needsBarOutline } from '../components/GanttChart/useBarContrast';

const css = readFileSync(resolve(process.cwd(), 'src/components/TaskRow/TaskRow.css'), 'utf8');

describe('chart contrast defaults', () => {
  it('keeps all in-bar labels free of filled backgrounds and padding', () => {
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    for (const name of ['gantt-tr-taskDuration', 'gantt-tr-progressText', 'gantt-tr-activityName']) {
      const matching = rules.filter(([, selector]) => selector.includes(`.${name}`));
      expect(matching.length).toBeGreaterThan(0);
      for (const [, , declarations] of matching) {
        expect(declarations).not.toMatch(/(?:^|;)\s*background(?:-color)?\s*:\s*(?!transparent\s*;)/m);
        expect(declarations).not.toMatch(/(?:^|;)\s*padding(?:-(?:left|right))?\s*:\s*(?!0(?:px)?\s*;)/m);
      }
    }
  });

  it('chooses plain dark-theme text against the base and progress without changing light', () => {
    const light: [number, number, number, number] = [255, 255, 255, 1];
    const dark: [number, number, number, number] = [29, 33, 43, 1];
    const white: [number, number, number, number] = [255, 255, 255, 1];
    const purple: [number, number, number, number] = [120, 47, 196, 1];
    const gray: [number, number, number, number] = [102, 102, 102, 1];
    expect(darkBarLabelStyle(white, undefined, light)).toEqual({});
    expect(darkBarLabelStyle(white, undefined, dark)).toEqual({ color: '#111' });
    expect(darkBarLabelStyle(white, gray, dark)).toEqual({ color: '#111', shadow: '0 1px 2px rgba(255,255,255,.9)' });
    expect(darkBarLabelStyle(purple, undefined, dark)).toEqual({});
  });

  it('adds a boundary only when the actual base fill and canvas contrast below 3:1', () => {
    const white: [number, number, number, number] = [255, 255, 255, 1];
    const dark: [number, number, number, number] = [29, 33, 43, 1];
    const blue: [number, number, number, number] = [59, 130, 246, 1];
    const nearBlack: [number, number, number, number] = [20, 20, 20, 1];
    expect(needsBarOutline(white, white)).toBe(true);
    expect(needsBarOutline(nearBlack, dark)).toBe(true);
    expect(needsBarOutline(blue, white)).toBe(false);
    expect(needsBarOutline(blue, dark)).toBe(false);
    expect(needsBarOutline([255, 255, 255, 0.1], white)).toBe(true);
  });
});
