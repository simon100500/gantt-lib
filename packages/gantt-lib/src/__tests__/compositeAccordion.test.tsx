import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';

const tasks: Task[] = [
  { id: 'floor-work', name: 'Floor work', startDate: '2026-03-02', endDate: '2026-03-04', composite: true },
  { id: 'floor-1', parentId: 'floor-work', name: 'Floor 1', startDate: '2026-03-02', endDate: '2026-03-04' },
  { id: 'floor-2', parentId: 'floor-work', name: 'Floor 2', startDate: '2026-03-05', endDate: '2026-03-09' },
  { id: 'doors', name: 'Doors', startDate: '2026-03-10', endDate: '2026-03-13' },
];

describe('composite Gantt accordion', () => {
  it('keeps ten details out of the row window until expansion', () => {
    const floors: Task[] = Array.from({ length: 10 }, (_, index) => ({
      id: `floor-${index + 1}`,
      parentId: 'laminate',
      name: `Floor ${index + 1}`,
      startDate: `2026-03-${String(index + 1).padStart(2, '0')}`,
      endDate: `2026-03-${String(index + 2).padStart(2, '0')}`,
    }));
    const { container } = render(
      <GanttChart
        tasks={[{ id: 'laminate', name: 'Laminate', composite: true, startDate: '2026-03-01', endDate: '2026-03-02' }, ...floors]}
        showTaskList
        containerHeight={900}
      />
    );
    const chartRows = () => container.querySelectorAll('.gantt-tr-row[data-gantt-task-row-id]');
    expect(chartRows()).toHaveLength(1);
    const bar = chartRows()[0].querySelector('[data-taskbar]')!;
    fireEvent.mouseDown(bar, { clientX: 100, clientY: 20 });
    fireEvent.click(bar, { clientX: 100, clientY: 20 });
    expect(chartRows()).toHaveLength(11);
  });

  it('previews on hover and inserts matching table and chart rows on click', () => {
    const { container } = render(
      <GanttChart tasks={tasks} showTaskList dayWidth={32} rowHeight={40} headerHeight={40} containerHeight={400} />
    );
    const rows = () => Array.from(container.querySelectorAll('.gantt-tr-row[data-gantt-task-row-id]'));
    expect(rows().map(row => row.getAttribute('data-gantt-task-row-id'))).toEqual(['floor-work', 'doors']);
    expect(parseFloat((rows()[0].querySelector('[data-taskbar]') as HTMLElement).style.width)).toBeGreaterThan(200);

    const bar = rows()[0].querySelector('[data-taskbar]')!;
    fireEvent.mouseEnter(bar);
    expect(container.querySelector('.gantt-tr-compositePreview')?.textContent).toContain('Floor 2');
    expect(rows()).toHaveLength(2);

    fireEvent.mouseDown(bar, { clientX: 200, clientY: 20 });
    fireEvent.click(bar, { clientX: 200, clientY: 20 });
    expect(rows().map(row => row.getAttribute('data-gantt-task-row-id'))).toEqual([
      'floor-work', 'floor-1', 'floor-2', 'doors',
    ]);
    expect((rows()[3].parentElement as HTMLElement).style.top).toBe('120px');

    const expandedBar = rows()[0].querySelector('[data-taskbar]')!;
    fireEvent.mouseDown(expandedBar, { clientX: 200, clientY: 20 });
    fireEvent.click(expandedBar, { clientX: 200, clientY: 20 });
    expect(rows()).toHaveLength(2);
  });
});
