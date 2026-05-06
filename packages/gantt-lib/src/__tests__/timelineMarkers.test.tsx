import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GanttChart, type Task } from '../components/GanttChart';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({ value }: { value?: string }) => <button type="button">{value}</button>,
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('timeline markers', () => {
  const tasks: Task[] = [
    {
      id: 'task-1',
      name: 'Task 1',
      startDate: '2026-02-01',
      endDate: '2026-02-05',
    },
  ];

  it('renders one vertical marker per configured date with tooltip metadata', () => {
    const { container } = render(
      <GanttChart
        tasks={tasks}
        dayWidth={40}
        timelineMarkers={[
          { date: '2026-02-03', color: '#ff0000', name: 'Release deadline' },
          { date: '2026-02-05', color: '#2563eb', name: 'Client review' },
        ]}
      />
    );

    const markers = container.querySelectorAll('.gantt-tm-marker');
    expect(markers).toHaveLength(2);

    const firstMarker = markers[0] as HTMLElement;
    const firstLine = firstMarker.querySelector('.gantt-tm-line') as HTMLElement | null;
    const highlightedHeaderCell = container.querySelector('.gantt-tsh-markerDay') as HTMLElement | null;

    expect(firstMarker.style.left).toBe('80px');
    expect(firstLine?.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(highlightedHeaderCell?.className).toContain('gantt-tsh-markerDay');

    fireEvent.mouseEnter(firstMarker.querySelector('.gantt-tm-hitArea') as HTMLElement);
    expect(container.querySelector('.gantt-timelineTooltip')?.textContent).toBe('03.02.26 Release deadline');

    fireEvent.mouseLeave(firstMarker.querySelector('.gantt-tm-hitArea') as HTMLElement);
    fireEvent.mouseEnter(highlightedHeaderCell as HTMLElement);
    expect(container.querySelector('.gantt-timelineTooltip')?.textContent).toBe('03.02.26 Release deadline');
  });

  it('does not render markers outside the visible range', () => {
    const { container } = render(
      <GanttChart
        tasks={tasks}
        timelineMarkers={[
          { date: '2025-12-31', name: 'Outside' },
        ]}
      />
    );

    expect(container.querySelector('.gantt-tm-marker')).toBeNull();
  });

  it('renders custom today tooltip and flag on the current date line', () => {
    const now = new Date();
    const iso = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);

    const { container } = render(
      <GanttChart
        tasks={[{
          id: 'today-task',
          name: 'Today Task',
          startDate: iso,
          endDate: iso,
        }]}
      />
    );

    const todayIndicator = container.querySelector('.gantt-ti-hitArea') as HTMLElement | null;
    const todayHeaderCell = container.querySelector('.gantt-tsh-today') as HTMLElement | null;

    fireEvent.mouseEnter(todayIndicator as HTMLElement);
    expect(container.querySelector('.gantt-timelineTooltip')?.textContent).toBe(`${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)} Сегодня`);

    fireEvent.mouseLeave(todayIndicator as HTMLElement);
    fireEvent.mouseEnter(todayHeaderCell as HTMLElement);
    expect(container.querySelector('.gantt-timelineTooltip')?.textContent).toBe(`${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)} Сегодня`);
  });
});
