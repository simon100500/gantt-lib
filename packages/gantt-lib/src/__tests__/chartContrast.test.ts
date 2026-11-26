// START_MODULE_CONTRACT
// PURPOSE: Verify contrast of built-in chart label and bar-edge defaults over arbitrary task colors.
// SCOPE: WCAG relative luminance of translucent label backing.
// INPUTS: Default CSS fallback alpha values and sampled sRGB task colors/progress overlays.
// OUTPUTS: Regression evidence for minimum text contrast without changing task colors.
// END_MODULE_CONTRACT
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { needsBarOutline } from '../components/GanttChart/useBarContrast';

const css = readFileSync(resolve(process.cwd(), 'src/components/TaskRow/TaskRow.css'), 'utf8');
const alpha = (name: string): number => {
  const match = css.match(new RegExp(`var\\(${name},\\s*rgba\\([^)]*,\\s*([0-9.]+)\\)\\)`));
  if (!match) throw new Error(`Missing ${name} fallback`);
  return Number(match[1]);
};
type RGB = [number, number, number];
const mix = (front: RGB, back: RGB, a: number): RGB => front.map((v, i) => v * a + back[i] * (1 - a)) as RGB;
const luminance = (rgb: RGB): number => {
  const values = rgb.map(value => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
};
const contrast = (a: RGB, b: RGB): number => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};
const white: RGB = [255, 255, 255], black: RGB = [0, 0, 0];

describe('chart contrast defaults', () => {
  it('keeps in-bar labels above 4.5:1 on colors and progress overlays', () => {
    const opacity = alpha('--gantt-bar-label-background');
    const colors: RGB[] = [white, [239, 68, 68], [250, 204, 21], [59, 130, 246], [20, 20, 20], [34, 197, 94]];
    for (const color of colors) {
      for (const surface of [color, mix(black, color, 0.4), mix([0, 103, 10], color, 0.4)]) {
        expect(contrast(white, mix(black, surface, opacity))).toBeGreaterThanOrEqual(4.5);
      }
    }
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
