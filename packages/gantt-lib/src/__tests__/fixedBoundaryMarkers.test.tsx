import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TaskRow from '../components/TaskRow';
import type { Task } from '../components/GanttChart';

describe('fixed boundary markers', () => {
  it.each([
    [false, false], [true, false], [false, true], [true, true],
  ])('shows start=%s and end=%s on task and parent bars', (start, end) => {
    const task: Task = { id: 'p', name: 'Parent', startDate: '2026-10-05', endDate: '2026-10-09',
      fixedStartDate: start ? '2026-10-05' : null, fixedEndDate: end ? '2026-10-09' : null };
    const child: Task = { id: 'c', parentId: 'p', name: 'Child', startDate: '2026-10-05', endDate: '2026-10-05' };
    for (const allTasks of [[task], [task, child]]) {
      const view = render(<TaskRow task={task} allTasks={allTasks} monthStart={new Date('2026-10-01T00:00:00Z')} dayWidth={2} rowHeight={40} />);
      expect(view.container.querySelectorAll('.gantt-tr-fixedBoundary-start')).toHaveLength(Number(start));
      expect(view.container.querySelectorAll('.gantt-tr-fixedBoundary-end')).toHaveLength(Number(end));
      view.unmount();
    }
  });
});
