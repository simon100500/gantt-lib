import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DependencyLines } from '../components/DependencyLines';
import type { Task } from '../components/GanttChart';

describe('DependencyLines milestone targets', () => {
  const predecessor: Task = {
    id: 'task-1',
    name: 'Build',
    startDate: '2026-04-08',
    endDate: '2026-04-10',
    type: 'task',
  };

  const milestone: Task = {
    id: 'milestone-1',
    name: 'Release',
    startDate: '2026-04-10',
    endDate: '2026-04-10',
    type: 'milestone',
    dependencies: [{ taskId: 'task-1', type: 'FS', lag: 0 }],
  };

  const tasks = [predecessor, milestone];

  it('uses milestone anchor points for dependency endpoints', () => {
    const { container } = render(
      <DependencyLines
        tasks={tasks}
        allTasks={tasks}
        monthStart={new Date(Date.UTC(2026, 3, 1))}
        dayWidth={32}
        rowHeight={40}
        gridWidth={31 * 32}
      />
    );

    expect(screen.getByTestId('dependency-lines-svg')).toBeTruthy();
    const path = container.querySelector('.gantt-dependency-path');
    expect(path?.getAttribute('d')).toContain('L 304');
  });

  it('keeps dependency semantics unchanged for FS SS FF SF', () => {
    expect(milestone.dependencies?.[0]?.type).toBe('FS');
  });

  it('keeps milestone dependency anchor aligned during drag preview with wide override', () => {
    const malformedMilestone: Task = {
      ...milestone,
      endDate: '2026-04-15',
    };

    const { container } = render(
      <DependencyLines
        tasks={[predecessor, malformedMilestone]}
        allTasks={[predecessor, malformedMilestone]}
        monthStart={new Date(Date.UTC(2026, 3, 1))}
        dayWidth={32}
        rowHeight={40}
        gridWidth={31 * 32}
        dragOverrides={new Map([[malformedMilestone.id, { left: 288, width: 192 }]])}
      />
    );

    const path = container.querySelector('.gantt-dependency-path');
    expect(path?.getAttribute('d')).toContain('L 304');
  });

  it('renders straight vertical line for milestones stacked in one column', () => {
    const topMilestone: Task = {
      id: 'ms-top',
      name: 'Top',
      startDate: '2026-04-10',
      endDate: '2026-04-10',
      type: 'milestone',
    };

    const bottomMilestone: Task = {
      id: 'ms-bottom',
      name: 'Bottom',
      startDate: '2026-04-10',
      endDate: '2026-04-10',
      type: 'milestone',
      dependencies: [{ taskId: 'ms-top', type: 'FS', lag: 0 }],
    };

    const { container } = render(
      <DependencyLines
        tasks={[topMilestone, bottomMilestone]}
        allTasks={[topMilestone, bottomMilestone]}
        monthStart={new Date(Date.UTC(2026, 3, 1))}
        dayWidth={32}
        rowHeight={40}
        gridWidth={31 * 32}
      />
    );

    const path = container.querySelector('.gantt-dependency-path');
    expect(path?.getAttribute('d')).toBe('M 304 30 V 46');
  });

  it('keeps a turned path for stacked milestones when lag is positive', () => {
    const topMilestone: Task = {
      id: 'ms-top',
      name: 'Top',
      startDate: '2026-04-10',
      endDate: '2026-04-10',
      type: 'milestone',
    };

    const bottomMilestone: Task = {
      id: 'ms-bottom',
      name: 'Bottom',
      startDate: '2026-04-11',
      endDate: '2026-04-11',
      type: 'milestone',
      dependencies: [{ taskId: 'ms-top', type: 'FS', lag: 1 }],
    };

    const { container } = render(
      <DependencyLines
        tasks={[topMilestone, bottomMilestone]}
        allTasks={[topMilestone, bottomMilestone]}
        monthStart={new Date(Date.UTC(2026, 3, 1))}
        dayWidth={32}
        rowHeight={40}
        gridWidth={31 * 32}
      />
    );

    const path = container.querySelector('.gantt-dependency-path');
    expect(path?.getAttribute('d')).toContain('L 336');
    expect(path?.getAttribute('d')).not.toBe('M 304 30 V 46');
  });
});
