// START_MODULE_CONTRACT
// PURPOSE: Resolve chart colors once per theme/data change and flag bar fills that blend into the canvas.
// SCOPE: Cache browser-resolved unique task/activity colors and choose a contrasting boundary only below 3:1.
// INPUTS: Chart root, task colors, computed inherited CSS variables, and ancestor theme attributes.
// OUTPUTS: Map from original CSS color expressions to a suitable boundary color; no per-row DOM measurements.
// END_MODULE_CONTRACT
import React, { createContext, useEffect, useState } from 'react';
import type { Task } from './GanttChart';

export const BarContrastContext = createContext<ReadonlyMap<string, string>>(new Map());
type RGBA = [number, number, number, number];
const over = (foreground: RGBA, background: RGBA): RGBA => {
  const a = foreground[3] + background[3] * (1 - foreground[3]);
  if (!a) return [0, 0, 0, 0];
  return [0, 1, 2].map(i => (foreground[i] * foreground[3] + background[i] * background[3] * (1 - foreground[3])) / a).concat(a) as RGBA;
};
const luminance = (color: RGBA): number => {
  const c = color.slice(0, 3).map(value => {
    const x = value / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: RGBA, b: RGBA): number => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

export const needsBarOutline = (fill: RGBA, canvas: RGBA): boolean => contrast(over(fill, canvas), canvas) < 3;

export function useBarContrast(root: React.RefObject<HTMLDivElement | null>, tasks: readonly Task[], enabled: boolean): ReadonlyMap<string, string> {
  const [edges, setEdges] = useState<ReadonlyMap<string, string>>(() => new Map());
  useEffect(() => {
    const host = root.current;
    if (!host || !enabled || typeof CanvasRenderingContext2D === 'undefined') return;
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden;pointer-events:none';
    host.appendChild(probe);
    const pixel = document.createElement('canvas');
    pixel.width = 1;
    pixel.height = 1;
    const context = pixel.getContext('2d', { willReadFrequently: true });
    if (!context) { probe.remove(); return; }
    const readColor = (computed: string): RGBA => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = computed;
      context.fillRect(0, 0, 1, 1);
      const c = context.getImageData(0, 0, 1, 1).data;
      return [c[0], c[1], c[2], c[3] / 255];
    };
    const resolve = (expression: string): RGBA | null => {
      probe.style.backgroundColor = '';
      probe.style.backgroundColor = expression;
      if (!probe.style.backgroundColor) return null;
      return readColor(getComputedStyle(probe).backgroundColor);
    };
    const candidates = new Set<string>(['var(--gantt-task-bar-default-color)', '#782FC4', 'var(--gantt-progress-accepted, #22c55e)', 'var(--gantt-progress-completed, #fbbf24)', 'var(--gantt-expired-color)', 'var(--gantt-critical-path-color, #dc2626)']);
    for (const task of tasks) {
      if (task.color) candidates.add(task.color);
      for (const activity of task.activities ?? []) if (activity.color) candidates.add(activity.color);
      const parent = task.color || '#782FC4';
      candidates.add(`color-mix(in srgb, ${parent} 40%, black)`);
    }
    candidates.add('color-mix(in srgb, var(--gantt-expired-color) 40%, black)');
    const refresh = () => {
      const ancestors: HTMLElement[] = [];
      for (let element: HTMLElement | null = host; element; element = element.parentElement) ancestors.push(element);
      const canvas = ancestors.reverse().reduce<RGBA>(
        (background, element) => over(readColor(getComputedStyle(element).backgroundColor), background),
        [255, 255, 255, 1],
      );
      const muted = resolve('var(--gantt-text-muted-color, #6b7280)');
      const white: RGBA = [255, 255, 255, 1], black: RGBA = [0, 0, 0, 1];
      const edge = muted && contrast(over(muted, canvas), canvas) >= 3 ? muted : contrast(white, canvas) >= contrast(black, canvas) ? white : black;
      const edgeCss = `rgb(${edge.slice(0, 3).map(Math.round).join(' ')} / ${edge[3]})`;
      const next = new Map<string, string>();
      for (const color of candidates) {
        const resolved = resolve(color);
        if (resolved && needsBarOutline(resolved, canvas)) next.set(color, edgeCss);
      }
      setEdges(previous => previous.size === next.size && [...next].every(([key, value]) => previous.get(key) === value) ? previous : next);
    };
    refresh();
    const observer = new MutationObserver(refresh);
    for (let element: HTMLElement | null = host; element; element = element.parentElement) observer.observe(element, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    return () => { observer.disconnect(); probe.remove(); };
  }, [root, tasks, enabled]);
  return edges;
}
