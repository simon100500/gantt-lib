import { describe, expect, it } from 'vitest';
import { computeLagFromDates } from '../core/scheduling/dependencies';
import { parseDateOnly } from '../core/scheduling/dateMath';
import type { Task, LinkType } from '../types';
import { createSampleTasks, MAIN_CHART_WEEKEND_PREDICATE } from '../../../website/src/data/sampleTasks';

describe('demo sample data self-consistency', () => {
  it('every stored lag equals the actual gap between the drawn bars', () => {
    const tasks: Task[] = createSampleTasks();
    const byId = new Map(tasks.map(task => [task.id, task]));
    const mismatched: string[] = [];

    for (const task of tasks) {
      for (const dep of task.dependencies ?? []) {
        const pred = byId.get(dep.taskId);
        if (!pred) continue;
        const pS = parseDateOnly(pred.startDate as string);
        const pE = pred.type === 'milestone' ? pS : parseDateOnly(pred.endDate as string);
        const implied = computeLagFromDates(
          dep.type,
          pS,
          pE,
          parseDateOnly(task.startDate as string),
          parseDateOnly(task.endDate as string),
          true,
          MAIN_CHART_WEEKEND_PREDICATE,
          task.type
        );
        if (implied !== dep.lag) {
          mismatched.push(`${pred.id}->${task.id} ${dep.type}: stored ${dep.lag}, implied ${implied}`);
        }
      }
    }

    expect(mismatched).toEqual([]);
  });

  it('the reported FS-link lag (Земляные работы -> Опалубка фундамента) matches the drawn gap', () => {
    const tasks: Task[] = createSampleTasks();
    const byId = new Map(tasks.map(task => [task.id, task]));
    const g31 = byId.get('g3-1')!;
    const g2 = byId.get('g2')!;
    const fs = g31.dependencies!.find(d => d.taskId === 'g2' && d.type === 'FS');
    expect(fs).toBeDefined();
    const implied = computeLagFromDates(
      fs!.type as LinkType,
      parseDateOnly(g2.startDate as string),
      parseDateOnly(g2.endDate as string),
      parseDateOnly(g31.startDate as string),
      parseDateOnly(g31.endDate as string),
      true,
      MAIN_CHART_WEEKEND_PREDICATE,
      g31.type
    );
    expect(fs!.lag).toBe(implied);
  });
});