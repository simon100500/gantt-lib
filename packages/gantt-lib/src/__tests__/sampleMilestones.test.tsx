import { describe, expect, it } from 'vitest';

import type { Task } from '../components/GanttChart';
import { normalizeTaskDatesForType } from '../utils/taskType';

describe('sample milestone targets', () => {
  const milestoneTask: Task = {
    id: 'milestone-1',
    name: 'Permit approved',
    startDate: '2026-04-10T13:00:00Z',
    endDate: '2026-04-12T13:00:00Z',
    type: 'milestone',
  };

  it.skip('sample tasks include milestone entries', async () => {
    const { createSampleTasks } = await import('../../../website/src/data/sampleTasks');
    const sampleTasks = createSampleTasks();

    expect(sampleTasks.some(task => task.type === 'milestone')).toBe(true);
  });

  it('sample milestones are normalized to a single date', () => {
    const normalized = normalizeTaskDatesForType(milestoneTask);

    expect(normalized.endDate).toBe('2026-04-10');
  });
});
