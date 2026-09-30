import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ACTIVITY_LANE_BAR_HEIGHT,
  ACTIVITY_LANE_STEP,
  computeActivityLanes,
  packIntervals,
  shiftActivityChain,
} from '../utils/activities';
import { GanttChart, type Task } from '../components/GanttChart';

describe('packIntervals', () => {
  it('keeps strictly sequential works in one lane', () => {
    const packed = packIntervals([
      { id: 'a', start: 0, end: 4 },
      { id: 'b', start: 4, end: 8 },
      { id: 'c', start: 8, end: 12 },
    ]);
    expect(packed.map(item => item.lane)).toEqual([0, 0, 0]);
  });

  it('opens a new lane only when intervals truly overlap', () => {
    const packed = packIntervals([
      { id: 'a', start: 0, end: 6 },
      { id: 'b', start: 4, end: 10 },
      { id: 'c', start: 10, end: 12 },
    ]);
    expect(packed.map(item => item.lane)).toEqual([0, 1, 0]);
  });

  it('counts three simultaneous works as three lanes', () => {
    const packed = packIntervals([
      { id: 'a', start: 0, end: 10 },
      { id: 'b', start: 1, end: 5 },
      { id: 'c', start: 2, end: 6 },
    ]);
    expect(packed.map(item => item.lane)).toEqual([0, 1, 2]);
  });
});

describe('computeActivityLanes', () => {
  const monthStart = new Date(Date.UTC(2026, 2, 1));

  it('packs sequential floor works into a single lane with px geometry', () => {
    const { segments, laneCount } = computeActivityLanes([
      { id: '1', name: 'Стяжка', startDate: '2026-03-02', endDate: '2026-03-04' },
      { id: '2', name: 'Обои', startDate: '2026-03-05', endDate: '2026-03-07' },
    ], monthStart, 40);
    expect(laneCount).toBe(1);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ left: 40, width: 120, lane: 0 });
    expect(segments[1]).toMatchObject({ left: 160, width: 120, lane: 0 });
  });

  it('splits overlapping works into separate lanes', () => {
    const { segments, laneCount } = computeActivityLanes([
      { id: '1', name: 'Стяжка', startDate: '2026-03-02', endDate: '2026-03-08' },
      { id: '2', name: 'Обои', startDate: '2026-03-05', endDate: '2026-03-10' },
    ], monthStart, 40);
    expect(laneCount).toBe(2);
    expect(segments.map(segment => segment.lane)).toEqual([0, 1]);
  });

  it('returns zero lanes for an empty list', () => {
    expect(computeActivityLanes([], monthStart, 40)).toEqual({ segments: [], laneCount: 0 });
  });
});

describe('shiftActivityChain (ОН-конвейер)', () => {
  const buildChainedTasks = () => [1, 2, 3].map(floor => ({
    id: `floor-${floor}`,
    activityChain: true as boolean,
    activities: [
      { id: 'w0', name: 'Стяжка', startDate: `2026-03-0${floor}`, endDate: `2026-03-0${floor + 2}` },
      { id: 'w1', name: 'Обои', startDate: `2026-03-0${floor + 3}`, endDate: `2026-03-0${floor + 4}` },
    ],
  }));

  it('pulls row successors and the same works of lower floors', () => {
    const shifts = shiftActivityChain(buildChainedTasks(), 'floor-1', 'w0', 2);
    expect(shifts.map(shift => shift.taskId)).toEqual(['floor-1', 'floor-2', 'floor-3']);
    const floor1 = shifts.find(shift => shift.taskId === 'floor-1')!;
    expect(floor1.activities.find(activity => activity.id === 'w1')!.startDate).toBe('2026-03-06');
    const floor3 = shifts.find(shift => shift.taskId === 'floor-3')!;
    expect(floor3.activities.find(activity => activity.id === 'w0')!.startDate).toBe('2026-03-05');
  });

  it('returns nothing when the dragged task is not chained', () => {
    const tasks = buildChainedTasks().map(task => ({ ...task, activityChain: false }));
    expect(shiftActivityChain(tasks, 'floor-1', 'w0', 2)).toEqual([]);
  });

  it('returns nothing for zero delta (resize of the left edge)', () => {
    expect(shiftActivityChain(buildChainedTasks(), 'floor-1', 'w0', 0)).toEqual([]);
  });

  it('skips a row without the chain flag and links the next flagged floor', () => {
    const tasks = buildChainedTasks();
    tasks[1] = { ...tasks[1], activityChain: false };
    const shifts = shiftActivityChain(tasks, 'floor-1', 'w0', 2);
    expect(shifts.map(shift => shift.taskId)).toEqual(['floor-1', 'floor-3']);
  });
});

describe('multi-activity rows in GanttChart', () => {
  const buildTasks = (): Task[] => [
    {
      id: 'floor-1',
      name: 'Этаж 1',
      startDate: '2026-03-02',
      endDate: '2026-03-13',
      activities: [
        { id: 'screed', name: 'Стяжка', startDate: '2026-03-02', endDate: '2026-03-05' },
        { id: 'wallpaper', name: 'Обои', startDate: '2026-03-04', endDate: '2026-03-08' },
      ],
    },
    {
      id: 'floor-2',
      name: 'Этаж 2',
      startDate: '2026-03-06',
      endDate: '2026-03-17',
      activities: [
        { id: 'screed', name: 'Стяжка', startDate: '2026-03-06', endDate: '2026-03-09' },
        { id: 'wallpaper', name: 'Обои', startDate: '2026-03-10', endDate: '2026-03-13' },
      ],
    },
  ];

  it('renders activity bars instead of the main bar and grows the row', () => {
    const { container } = render(
      <GanttChart tasks={buildTasks()} dayWidth={40} rowHeight={40} containerHeight={400} businessDays={false} />
    );
    const rows = () => Array.from(container.querySelectorAll<HTMLElement>('.gantt-tr-row[data-gantt-task-row-id]'));
    expect(rows()).toHaveLength(2);

    const expandedRow = rows()[0];
    // Two concurrent works → 2 lanes → 2*22 + 2*2 padding = 48px > rowHeight 40.
    expect(expandedRow.style.height).toBe(`${2 * ACTIVITY_LANE_STEP + 4}px`);
    const bars = expandedRow.querySelectorAll('.gantt-tr-activityBar');
    expect(bars).toHaveLength(2);
    expect((bars[0] as HTMLElement).style.height).toBe(`${ACTIVITY_LANE_BAR_HEIGHT}px`);
    expect(expandedRow.querySelector('[data-taskbar]')).toBeNull();

    // Sequential works keep the normal row height and a single lane.
    const compactRow = rows()[1];
    expect(compactRow.style.height).toBe('40px');
    expect(compactRow.querySelectorAll('.gantt-tr-activityBar')).toHaveLength(2);
  });

  it('extends the visible date range to cover activity dates', () => {
    const tasks: Task[] = [{
      id: 'floor-1',
      name: 'Этаж 1',
      startDate: '2026-03-02',
      endDate: '2026-03-02',
      activities: [
        { id: 'a', name: 'A', startDate: '2026-03-02', endDate: '2026-03-02' },
        { id: 'b', name: 'B', startDate: '2026-04-10', endDate: '2026-04-12' },
      ],
    }];
    const { container } = render(
      <GanttChart tasks={tasks} dayWidth={40} rowHeight={40} containerHeight={200} businessDays={false} />
    );
    // Without activities in the range the auto range would span March–May
    // (92 days = 3680px); the April activity must push the grid wider.
    const surface = container.querySelector<HTMLElement>('.gantt-chartSurface');
    expect(surface).not.toBeNull();
    expect(parseInt(surface!.style.minWidth, 10)).toBeGreaterThan(4000);
    expect(container.querySelectorAll('.gantt-tr-activityBar')).toHaveLength(2);
  });

  it('moves an activity by day-snapped drag and commits the updated task', () => {
    const onTasksChange = vi.fn();
    const { container } = render(
      <GanttChart
        tasks={buildTasks()}
        onTasksChange={onTasksChange}
        dayWidth={40}
        rowHeight={40}
        containerHeight={400}
        businessDays={false}
      />
    );
    const bar = container.querySelector<HTMLElement>('[data-gantt-task-row-id="floor-2"] [data-activity-id="wallpaper"]')!;
    expect(bar).not.toBeNull();

    fireEvent.mouseDown(bar, { clientX: 500, clientY: 20 });
    fireEvent.mouseMove(window, { clientX: 540, clientY: 20 });
    fireEvent.mouseUp(window);

    expect(onTasksChange).toHaveBeenCalledTimes(1);
    const [changedTask] = onTasksChange.mock.calls[0][0] as Task[];
    expect(changedTask.id).toBe('floor-2');
    const moved = changedTask.activities!.find(activity => activity.id === 'wallpaper')!;
    expect(moved.startDate).toBe('2026-03-11');
    expect(moved.endDate).toBe('2026-03-14');
    // Sequential sibling stays untouched.
    expect(changedTask.activities!.find(activity => activity.id === 'screed')!.startDate).toBe('2026-03-06');
  });

  it('resizes an activity from its right edge', () => {
    const onTasksChange = vi.fn();
    const { container } = render(
      <GanttChart
        tasks={buildTasks()}
        onTasksChange={onTasksChange}
        dayWidth={40}
        rowHeight={40}
        containerHeight={400}
        businessDays={false}
      />
    );
    const bar = container.querySelector<HTMLElement>('[data-gantt-task-row-id="floor-2"] [data-activity-id="wallpaper"]')!;
    const handle = bar.querySelector<HTMLElement>('.gantt-tr-resizeHandleRight')!;

    fireEvent.mouseDown(handle, { clientX: 500, clientY: 20 });
    fireEvent.mouseMove(window, { clientX: 540, clientY: 20 });
    fireEvent.mouseUp(window);

    expect(onTasksChange).toHaveBeenCalledTimes(1);
    const [changedTask] = onTasksChange.mock.calls[0][0] as Task[];
    const resized = changedTask.activities!.find(activity => activity.id === 'wallpaper')!;
    expect(resized.startDate).toBe('2026-03-10');
    expect(resized.endDate).toBe('2026-03-14');
  });

  it('moves the conveyor live during the drag, before the commit', () => {
    const onTasksChange = vi.fn();
    const chained = buildTasks().map(task => ({ ...task, activityChain: true }));
    const { container } = render(
      <GanttChart
        tasks={chained}
        onTasksChange={onTasksChange}
        dayWidth={40}
        rowHeight={40}
        containerHeight={400}
        businessDays={false}
      />
    );
    const dragged = container.querySelector<HTMLElement>('[data-gantt-task-row-id="floor-1"] [data-activity-id="screed"]')!;
    const follower = () => container.querySelector<HTMLElement>('[data-gantt-task-row-id="floor-2"] [data-activity-id="screed"]')!;
    const before = parseInt(follower().style.left, 10);

    fireEvent.mouseDown(dragged, { clientX: 500, clientY: 20 });
    fireEvent.mouseMove(window, { clientX: 540, clientY: 20 });

    // Still dragging: the floor below has already shifted by one day (40px).
    expect(parseInt(follower().style.left, 10)).toBe(before + 40);
    expect(onTasksChange).not.toHaveBeenCalled();

    fireEvent.mouseUp(window);
    expect(onTasksChange).toHaveBeenCalledTimes(1);
    // After the commit the store is cleared: no double shift from props + overrides.
    expect(parseInt(follower().style.left, 10)).toBe(before);
  });

  it('marks tall activity rows so the task list label aligns to the top', () => {
    const { container } = render(
      <GanttChart
        tasks={buildTasks()}
        showTaskList
        dayWidth={40}
        rowHeight={40}
        containerHeight={400}
        businessDays={false}
      />
    );
    // floor-1 has overlapping works → 2 lanes → row taller than rowHeight.
    const tallRow = container.querySelector('.gantt-tl-row[data-gantt-task-row-id="floor-1"]');
    expect(tallRow?.className).toContain('gantt-tl-row-activities');
    // floor-2 works are sequential → normal height, no alignment class.
    const shortRow = container.querySelector('.gantt-tl-row[data-gantt-task-row-id="floor-2"]');
    expect(shortRow?.className).not.toContain('gantt-tl-row-activities');
  });

  it('pulls the whole conveyor when dragging a chained row', () => {
    const onTasksChange = vi.fn();
    const chained = buildTasks().map(task => ({ ...task, activityChain: true }));
    const { container } = render(
      <GanttChart
        tasks={chained}
        onTasksChange={onTasksChange}
        dayWidth={40}
        rowHeight={40}
        containerHeight={400}
        businessDays={false}
      />
    );
    const bar = container.querySelector<HTMLElement>('[data-gantt-task-row-id="floor-1"] [data-activity-id="screed"]')!;
    fireEvent.mouseDown(bar, { clientX: 500, clientY: 20 });
    fireEvent.mouseMove(window, { clientX: 540, clientY: 20 });
    fireEvent.mouseUp(window);

    expect(onTasksChange).toHaveBeenCalledTimes(1);
    const changed = onTasksChange.mock.calls[0][0] as Task[];
    expect(changed.map(task => task.id)).toEqual(['floor-1', 'floor-2']);
    const floor1 = changed.find(task => task.id === 'floor-1')!;
    // Row successors follow the dragged Стяжка.
    expect(floor1.activities!.find(activity => activity.id === 'wallpaper')!.startDate).toBe('2026-03-05');
    const floor2 = changed.find(task => task.id === 'floor-2')!;
    // The same work on the floor below is pulled too, together with its row chain.
    expect(floor2.activities!.find(activity => activity.id === 'screed')!.startDate).toBe('2026-03-07');
    expect(floor2.activities!.find(activity => activity.id === 'wallpaper')!.startDate).toBe('2026-03-11');
  });

  it('shows custom tooltip fields like the contractor', () => {
    const tasks: Task[] = [{
      id: 'floor-1',
      name: 'Этаж 1',
      startDate: '2026-03-02',
      endDate: '2026-03-13',
      activities: [
        {
          id: 'wallpaper',
          name: 'Обои',
          startDate: '2026-03-04',
          endDate: '2026-03-08',
          tooltipFields: [{ label: 'Подрядчик', value: 'ООО СК Строй' }],
        },
      ],
    }];
    const { container } = render(
      <GanttChart tasks={tasks} dayWidth={40} rowHeight={40} containerHeight={200} businessDays={false} />
    );
    const bar = container.querySelector<HTMLElement>('[data-activity-id="wallpaper"]')!;
    fireEvent.mouseEnter(bar, { clientX: 300, clientY: 20 });

    const tip = document.querySelector('.gantt-tr-activityTip');
    expect(tip).not.toBeNull();
    expect(tip!.querySelector('.gantt-tr-activityTipFieldLabel')?.textContent).toBe('Подрядчик');
    expect(tip!.querySelector('.gantt-tr-activityTipFieldValue')?.textContent).toBe('ООО СК Строй');
  });

  it('shows a hover tooltip with the activity name and dates', () => {
    const { container } = render(
      <GanttChart tasks={buildTasks()} dayWidth={40} rowHeight={40} containerHeight={400} businessDays={false} />
    );
    expect(document.querySelector('.gantt-tr-activityTip')).toBeNull();

    const bar = container.querySelector<HTMLElement>('[data-gantt-task-row-id="floor-1"] [data-activity-id="wallpaper"]')!;
    fireEvent.mouseEnter(bar, { clientX: 300, clientY: 20 });

    const tip = document.querySelector('.gantt-tr-activityTip');
    expect(tip).not.toBeNull();
    expect(tip!.textContent).toContain('Обои');
    expect(tip!.textContent).toContain('5 д');

    fireEvent.mouseLeave(bar);
    expect(document.querySelector('.gantt-tr-activityTip')).toBeNull();
  });
});
