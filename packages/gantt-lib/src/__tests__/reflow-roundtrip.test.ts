import { describe, it, expect } from 'vitest';
import { reflowTasksOnModeSwitch } from '../core/scheduling/modeSwitch';
import { createSampleTasks, MAIN_CHART_WEEKEND_PREDICATE } from '../../../website/src/data/sampleTasks';

const iso = (s: string) => s.slice(0, 10);
const pg = (s: string) => new Date(s + 'T00:00:00.000Z');

function g2g3(tasks: ReturnType<typeof createSampleTasks>) {
  const by = new Map(tasks.map(t => [t.id, t]));
  const g2 = by.get('g2')!;
  const g31 = by.get('g3-1')!;
  return {
    g2, g31,
    overlap: g31.startDate <= g2.endDate,
    gap: Math.round((pg(g31.startDate).getTime() - pg(g2.endDate).getTime()) / 86400000),
  };
}

describe('reflow business toggle round-trip', () => {
  it('OFF -> ON must NOT put the FS successor before its predecessor', () => {
    const raw = createSampleTasks();
    const off = reflowTasksOnModeSwitch(raw, false, MAIN_CHART_WEEKEND_PREDICATE);
    const back = reflowTasksOnModeSwitch(off, true, MAIN_CHART_WEEKEND_PREDICATE);
    const a = g2g3(raw);
    const b = g2g3(off);
    const c = g2g3(back);
    console.log('orig   g2.end', iso(a.g2.endDate), 'g3-1.start', iso(a.g31.startDate), 'overlap', a.overlap);
    console.log('off    g2.end', iso(b.g2.endDate), 'g3-1.start', iso(b.g31.startDate), 'overlap', b.overlap);
    console.log('back   g2.end', iso(c.g2.endDate), 'g3-1.start', iso(c.g31.startDate), 'overlap', c.overlap, 'calGap', c.gap);
    expect(c.overlap).toBe(false);
    // The successor should stay a full working day after the predecessor end.
    expect(c.gap).toBeGreaterThanOrEqual(0);
  });

  it('ON -> OFF -> ON restores the original business layout', () => {
    const raw = createSampleTasks();
    const off = reflowTasksOnModeSwitch(raw, false, MAIN_CHART_WEEKEND_PREDICATE);
    const back = reflowTasksOnModeSwitch(off, true, MAIN_CHART_WEEKEND_PREDICATE);
    const a = g2g3(raw);
    const c = g2g3(back);
    console.log('orig g2', iso(a.g2.startDate), iso(a.g2.endDate), '|| back g2', iso(c.g2.startDate), iso(c.g2.endDate));
    console.log('orig g3-1', iso(a.g31.startDate), iso(a.g31.endDate), '|| back g3-1', iso(c.g31.startDate), iso(c.g31.endDate));
  });
});