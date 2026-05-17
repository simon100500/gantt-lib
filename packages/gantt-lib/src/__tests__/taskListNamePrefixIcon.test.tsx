import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';

describe('TaskList name prefix icon', () => {
  it('renders a custom prefix icon only for rows selected by the callback', () => {
    const tasks: Task[] = [
      {
        id: 'root-task',
        name: 'Project Root',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
      },
      {
        id: 'child-task',
        parentId: 'root-task',
        name: 'Child Task',
        startDate: '2026-03-02',
        endDate: '2026-03-03',
      },
    ];

    const { container } = render(
      <GanttChart
        tasks={tasks}
        showTaskList={true}
        showChart={false}
        rowHeight={36}
        headerHeight={36}
        getTaskListNamePrefixIcon={(task) => (
          !task.parentId ? <span data-testid={`prefix-${task.id}`}>H</span> : undefined
        )}
      />
    );

    expect(screen.getByTestId('prefix-root-task')).toBeTruthy();
    expect(screen.queryByTestId('prefix-child-task')).toBeNull();
    expect(container.querySelectorAll('.gantt-tl-name-trigger-icon')).toHaveLength(1);
  });
});
