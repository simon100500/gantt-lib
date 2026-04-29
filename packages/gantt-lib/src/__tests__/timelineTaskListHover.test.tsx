import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';

describe('GanttChart shared row hover', () => {
  it('uses one hover state for matching task-list and timeline rows in both directions', () => {
    const tasks: Task[] = [
      {
        id: 'task-1',
        name: 'First Task',
        startDate: '2026-03-13',
        endDate: '2026-03-16',
      },
      {
        id: 'task-2',
        name: 'Second Task',
        startDate: '2026-03-20',
        endDate: '2026-03-21',
      },
    ];

    const { container } = render(
      <GanttChart
        tasks={tasks}
        showTaskList={true}
        rowHeight={36}
        headerHeight={36}
      />
    );

    const timelineRows = container.querySelectorAll('.gantt-tr-row');
    const taskListRows = container.querySelectorAll('.gantt-tl-row');
    const scrollContent = container.querySelector('.gantt-scrollContent') as HTMLElement;

    expect(timelineRows).toHaveLength(2);
    expect(taskListRows).toHaveLength(2);
    expect(scrollContent).not.toBeNull();

    fireEvent.mouseOver(timelineRows[1] as HTMLElement);

    expect((taskListRows[0] as HTMLElement).classList.contains('gantt-tl-row-hovered')).toBe(false);
    expect((taskListRows[1] as HTMLElement).classList.contains('gantt-tl-row-hovered')).toBe(true);
    expect((timelineRows[1] as HTMLElement).classList.contains('gantt-tr-row-hovered')).toBe(true);

    fireEvent.mouseOver(taskListRows[0] as HTMLElement);

    expect((taskListRows[0] as HTMLElement).classList.contains('gantt-tl-row-hovered')).toBe(true);
    expect((taskListRows[1] as HTMLElement).classList.contains('gantt-tl-row-hovered')).toBe(false);
    expect((timelineRows[0] as HTMLElement).classList.contains('gantt-tr-row-hovered')).toBe(true);
    expect((timelineRows[1] as HTMLElement).classList.contains('gantt-tr-row-hovered')).toBe(false);

    fireEvent.mouseLeave(scrollContent);

    expect((taskListRows[0] as HTMLElement).classList.contains('gantt-tl-row-hovered')).toBe(false);
    expect((timelineRows[0] as HTMLElement).classList.contains('gantt-tr-row-hovered')).toBe(false);
  });
});
