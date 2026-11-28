import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GridBackground from '../components/GridBackground/GridBackground';
import TaskRow from '../components/TaskRow';
import type { Task } from '../components/GanttChart';
import { GanttChart } from '../components/GanttChart';
import { createActivityPreviewStore } from '../components/GanttChart/previewStore';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const days = (count: number): Date[] =>
  Array.from({ length: count }, (_, index) => new Date(Date.UTC(2026, 2, 1 + index)));

describe('horizontal window rendering (pan optimization)', () => {
  it('includes works entering the window through a live conveyor preview', () => {
    const task: Task = { id: 'r', name: 'R', startDate: '2026-03-01', endDate: '2026-03-21', activities: [
      { id: 'near', name: 'Near', startDate: '2026-03-01', endDate: '2026-03-02' },
      { id: 'far', name: 'Far', startDate: '2026-03-20', endDate: '2026-03-21' },
    ] };
    const store = createActivityPreviewStore();
    const { container } = render(<TaskRow task={task} monthStart={new Date('2026-03-01T00:00:00Z')}
      dayWidth={40} rowHeight={40} activityPreviewStore={store} horizontalWindow={{ startPx: 0, endPx: 200 }} />);
    expect(container.querySelector('[data-activity-id="far"]')).toBeNull();
    act(() => store.setOverrides(new Map([['r', new Map([['far', -18], ['near', 20]])]])));
    expect(container.querySelector('[data-activity-id="far"]')).not.toBeNull();
    expect(container.querySelector('[data-activity-id="near"]')).toBeNull();
    act(() => store.clear());
    expect(container.querySelector('[data-activity-id="far"]')).toBeNull();
    expect(container.querySelector('[data-activity-id="near"]')).not.toBeNull();
  });
  it('keeps the public chart windowed on both axes after large pan jumps', () => {
    const day = (offset: number) => new Date(Date.UTC(2026, 2, 1 + offset));
    const tasks: Task[] = Array.from({ length: 125 }, (_, row) => ({
      id: `r${row}`, name: `Row ${row}`, startDate: day(0), endDate: day(319),
      activities: Array.from({ length: 40 }, (_, index) => ({
        id: `a${index}`, name: `Work ${index}`, startDate: day(index * 8), endDate: day(index * 8 + 7),
      })),
    }));
    let frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length; });
    const { container } = render(<GanttChart tasks={tasks} dayWidth={40} rowHeight={40} containerHeight={400}
      businessDays={false} showTaskList={false} dateRange={{ start: day(0), end: day(319) }} />);
    const scroll = container.querySelector<HTMLElement>('.gantt-scrollContainer')!;
    Object.defineProperty(scroll, 'clientWidth', { value: 1000 });
    Object.defineProperty(scroll, 'clientHeight', { value: 400 });
    const flush = () => act(() => { const callbacks = frames; frames = []; callbacks.forEach(callback => callback(0)); });
    for (const [left, top] of [[0, 0], [6000, 0], [6000, 3200], [0, 640]]) {
      scroll.scrollLeft = left; scroll.scrollTop = top;
      fireEvent.scroll(scroll); flush();
      const bars = [...container.querySelectorAll<HTMLElement>('.gantt-tr-activityBar')];
      const rowCount = container.querySelectorAll('.gantt-tr-row').length;
      expect(rowCount).toBeLessThan(32);
      expect(bars.length).toBeGreaterThan(0);
      expect(bars.length).toBeLessThan(rowCount * 12);
      const bucket = Math.floor(left / 480) * 480;
      for (const bar of bars) {
        expect(parseFloat(bar.style.left)).toBeLessThanOrEqual(bucket + 1000 + 960);
        expect(parseFloat(bar.style.left) + parseFloat(bar.style.width)).toBeGreaterThanOrEqual(Math.max(0, bucket - 960));
      }
    }
  });
  it('GridBackground skips grid lines outside the visible window', () => {
    const all = render(
      <GridBackground dateRange={days(30)} dayWidth={20} totalHeight={400} />
    );
    const allLines = all.container.querySelectorAll('.gantt-gb-gridLine').length;

    const windowed = render(
      <GridBackground
        dateRange={days(30)}
        dayWidth={20}
        totalHeight={400}
        horizontalWindow={{ startPx: 0, endPx: 100 }}
      />
    );
    const visibleLines = windowed.container.querySelectorAll('.gantt-gb-gridLine').length;

    expect(allLines).toBeGreaterThan(20);
    expect(visibleLines).toBeGreaterThan(0);
    expect(visibleLines).toBeLessThan(allLines);
  });

  it('windows a mixed 1000-row schedule and mounts calendars only for visible unscheduled rows', () => {
    const day = (offset: number) => new Date(Date.UTC(2026, 2, 1 + offset));
    const tasks: Task[] = Array.from({ length: 1000 }, (_, index) => ({
      id: `mixed-${index}`,
      name: `Work ${index}`,
      ...(index % 4 === 0 ? { startDate: day(5) }
        : index % 4 === 1 ? { endDate: day(170) }
          : index % 4 === 2 ? { durationDays: 3 } : { startDate: day(20), endDate: day(30) }),
    }));
    let frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length; });
    const { container } = render(<GanttChart tasks={tasks} dayWidth={40} rowHeight={40} containerHeight={400}
      businessDays={false} showTaskList dateRange={{ start: day(0), end: day(240) }} onTasksChange={vi.fn()} />);
    const scroll = container.querySelector<HTMLElement>('.gantt-scrollContainer')!;
    Object.defineProperty(scroll, 'clientWidth', { value: 1000 });
    Object.defineProperty(scroll, 'clientHeight', { value: 400 });
    const pan = (left: number, top: number) => {
      scroll.scrollLeft = left;
      scroll.scrollTop = top;
      fireEvent.scroll(scroll);
      act(() => { const pending = frames; frames = []; pending.forEach(callback => callback(0)); });
      expect(container.querySelectorAll('.gantt-tr-row').length).toBeLessThan(32);
      expect(container.querySelectorAll('[data-row-index]').length).toBeLessThan(32);
      expect(container.querySelectorAll('.gantt-unscheduled-picker').length).toBeGreaterThan(0);
      expect(container.querySelectorAll('.gantt-unscheduled-task[data-has-anchor]')).toHaveLength(0);
    };
    const bar = (id: number) => container.querySelector(`[data-gantt-task-row-id="mixed-${id}"] .gantt-partial-task`);

    pan(0, 0);
    expect(bar(0)).not.toBeNull();
    expect(bar(1)).toBeNull();
    pan(6400, 0);
    expect(bar(0)).toBeNull();
    expect(bar(1)).not.toBeNull();
    expect(container.querySelector<HTMLElement>('.gantt-taskArea')!.style.getPropertyValue('--gantt-visible-timeline-left')).toBe('6400px');
    const dragged = bar(1)!;
    const pointer = (type: string) => Object.assign(
      new MouseEvent(type, { bubbles: true, button: 0 }),
      { pointerId: 1, isPrimary: true },
    );
    fireEvent(dragged, pointer('pointerdown'));
    pan(6400, 16000);
    expect(bar(1)).toBe(dragged);
    fireEvent(dragged, pointer('pointercancel'));
    expect(bar(1)).toBeNull();
    expect(bar(401)).not.toBeNull();
  });

  it('TaskRow renders only activity bars inside the window', () => {
    const task: Task = {
      id: 'floor-1',
      name: 'Этаж 1',
      startDate: '2026-03-01',
      endDate: '2026-05-02',
      activities: [
        { id: 'a', name: 'A', startDate: '2026-03-01', endDate: '2026-03-02' },
        { id: 'b', name: 'B', startDate: '2026-04-01', endDate: '2026-04-02' },
        { id: 'c', name: 'C', startDate: '2026-05-01', endDate: '2026-05-02' },
      ],
    };
    const monthStart = new Date(Date.UTC(2026, 2, 1));

    const full = render(
      <TaskRow task={task} monthStart={monthStart} dayWidth={40} rowHeight={40} allTasks={[task]} onTasksChange={vi.fn()} />
    );
    expect(full.container.querySelectorAll('.gantt-tr-activityBar')).toHaveLength(3);

    const windowed = render(
      <TaskRow
        task={task}
        monthStart={monthStart}
        dayWidth={40}
        rowHeight={40}
        allTasks={[task]}
        onTasksChange={vi.fn()}
        horizontalWindow={{ startPx: 0, endPx: 200 }}
      />
    );
    const bars = windowed.container.querySelectorAll('.gantt-tr-activityBar');
    expect(bars).toHaveLength(1);
    expect(bars[0].getAttribute('data-activity-id')).toBe('a');
  });
});
