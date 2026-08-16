import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DependencyLines } from '../components/DependencyLines';
import type { Task } from '../components/GanttChart';

function makeTask(partial: Partial<Task> & { id: string; startDate: string; endDate: string; dependencies?: Task['dependencies'] }): Task {
  return { name: partial.id, ...partial } as Task;
}

const monthStart = new Date(Date.UTC(2026, 1, 1));

function renderLines(tasks: Task[], allTasks: Task[], criticalTaskIds?: Set<string>) {
  return render(
    <DependencyLines
      tasks={tasks}
      allTasks={allTasks}
      monthStart={monthStart}
      dayWidth={40}
      rowHeight={40}
      gridWidth={400}
      rowIndexByTaskId={new Map(tasks.map((t, i) => [t.id, i]))}
      criticalTaskIds={criticalTaskIds}
    />
  );
}

describe('DependencyLines critical path highlighting', () => {
  it('adds the critical class when both ends are critical', () => {
    const a = makeTask({ id: 'A', startDate: '2026-02-02', endDate: '2026-02-04' });
    const b = makeTask({
      id: 'B',
      startDate: '2026-02-05',
      endDate: '2026-02-07',
      dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
    });
    const { container } = renderLines([a, b], [a, b], new Set(['A', 'B']));

    const criticalLines = container.querySelectorAll('.gantt-dependency-critical');
    expect(criticalLines.length).toBe(1);
  });

  it('keeps default styling when criticalTaskIds is empty or not provided', () => {
    const a = makeTask({ id: 'A', startDate: '2026-02-02', endDate: '2026-02-04' });
    const b = makeTask({
      id: 'B',
      startDate: '2026-02-05',
      endDate: '2026-02-07',
      dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
    });
    const { container, rerender } = renderLines([a, b], [a, b], undefined);
    expect(container.querySelectorAll('.gantt-dependency-critical').length).toBe(0);

    rerender(
      <DependencyLines
        tasks={[a, b]}
        allTasks={[a, b]}
        monthStart={monthStart}
        dayWidth={40}
        rowHeight={40}
        gridWidth={400}
        rowIndexByTaskId={new Map([[a.id, 0], [b.id, 1]])}
        criticalTaskIds={new Set(['A'])}
      />
    );
    expect(container.querySelectorAll('.gantt-dependency-critical').length).toBe(0);
  });
});
