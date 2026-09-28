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
    expect(bar.classList.contains('gantt-tr-parentBar')).toBe(false);
    expect(bar.classList.contains('gantt-tr-compositeBar')).toBe(true);
    fireEvent.mouseEnter(bar);
    expect(document.querySelectorAll('.gantt-tr-compositePreviewBar')).toHaveLength(10);
    fireEvent.mouseDown(bar, { clientX: 100, clientY: 20 });
    fireEvent.mouseUp(bar, { clientX: 100, clientY: 20 });
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
    expect(document.querySelector('.gantt-tr-compositePreview')?.textContent).toContain('Floor 2');
    expect(document.querySelectorAll('.gantt-tr-compositePreviewBar')).toHaveLength(2);
    expect(container.querySelectorAll('.gantt-tr-compositeSegment')).toHaveLength(2);
    expect(rows()).toHaveLength(2);
    expect(rows()[0].querySelector('.gantt-tr-compositeDuration')?.textContent).toBe('6 д');
    expect(rows()[0].querySelector('.gantt-tr-externalTaskName')?.textContent).toBe('Floor work');

    fireEvent.mouseDown(bar, { clientX: 200, clientY: 20 });
    fireEvent.mouseMove(bar, { clientX: 230, clientY: 20 });
    fireEvent.mouseUp(bar, { clientX: 230, clientY: 20 });
    fireEvent.click(bar, { clientX: 230, clientY: 20 });
    expect(rows()).toHaveLength(2);

    fireEvent.mouseDown(bar, { clientX: 200, clientY: 20 });
    fireEvent.mouseUp(bar, { clientX: 200, clientY: 20 });
    fireEvent.click(bar, { clientX: 200, clientY: 20 });
    expect(rows().map(row => row.getAttribute('data-gantt-task-row-id'))).toEqual([
      'floor-work', 'floor-1', 'floor-2', 'doors',
    ]);
    expect(rows()[1].querySelector('.gantt-tr-externalDuration')?.textContent).toBe('3 д');
    expect(rows()[1].querySelector('.gantt-tr-taskDuration')).toBeNull();
    expect((rows()[3].parentElement as HTMLElement).style.top).toBe('92px');
    const tableDoor = container.querySelector('.gantt-tl-row[data-gantt-task-row-id="doors"]');
    expect((tableDoor?.parentElement as HTMLElement).style.top).toBe('92px');
    expect((rows()[1] as HTMLElement).style.height).toBe('22px');

    const expandedBar = rows()[0].querySelector('[data-taskbar]')!;
    fireEvent.mouseDown(expandedBar, { clientX: 200, clientY: 20 });
    fireEvent.mouseUp(expandedBar, { clientX: 200, clientY: 20 });
    fireEvent.click(expandedBar, { clientX: 200, clientY: 20 });
    expect(rows()).toHaveLength(2);

    const tableName = container.querySelector('.gantt-tl-row[data-gantt-task-row-id="floor-work"] .gantt-tl-name-trigger')!;
    fireEvent.click(tableName);
    expect(rows()).toHaveLength(4);
    expect(tableName.getAttribute('aria-expanded')).toBe('true');
    expect(tableName.querySelector('path[d="m15 5 3 3 3-3"]')).not.toBeNull();
    fireEvent.click(tableName);
    expect(rows()).toHaveLength(2);
    expect(tableName.querySelector('path[d="m15 8 3-3 3 3"]')).not.toBeNull();
  });

  it('tints composite detail rows in both panes and shares row hover across the full chart row', () => {
    const coloredTasks: Task[] = [
      { id: 'group', name: 'Group', composite: true, color: '#0891b2', startDate: '2026-03-02', endDate: '2026-03-04' },
      { id: 'child', parentId: 'group', name: 'Child', startDate: '2026-03-02', endDate: '2026-03-04' },
    ];
    const { container } = render(
      <GanttChart tasks={coloredTasks} showTaskList dayWidth={32} rowHeight={40} containerHeight={400} />
    );

    fireEvent.click(container.querySelector('.gantt-tl-row[data-gantt-task-row-id="group"] .gantt-tl-compositeToggle')!);

    const tableChild = container.querySelector('.gantt-tl-row[data-gantt-task-row-id="child"]') as HTMLElement;
    const chartChild = container.querySelector('.gantt-tr-row[data-gantt-task-row-id="child"]') as HTMLElement;
    expect(tableChild.style.getPropertyValue('--gantt-tl-composite-detail-color')).toBe('#0891b2');
    expect(chartChild.style.getPropertyValue('--gantt-tr-composite-detail-color')).toBe('#0891b2');

    fireEvent.mouseOver(chartChild);
    expect(chartChild.classList.contains('gantt-tr-row-hovered')).toBe(true);
    expect(tableChild.classList.contains('gantt-tl-row-hovered')).toBe(true);
  });
});
