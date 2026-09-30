import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ACTIVITY_LANE_BAR_HEIGHT,
  ACTIVITY_LANE_STEP,
  activityChainMinStartDelta,
  activityStartConstraint,
  computeActivityLanes,
  packIntervals,
  pushActivityChain,
  shiftActivityChain,
} from '../utils/activities';
import { GanttChart, type Task, type TaskActivity } from '../components/GanttChart';

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

describe('pushActivityChain (выталкивание, ASAP)', () => {
  // Этаж 1: Стяжка 1–3, Обои 4–6 (вплотную). Этаж 2: Стяжка 11–13, Обои 21–23 (запас перед Обои).
  const buildPushTasks = (): Array<{ id: string; activityChain: boolean | 'push'; activities: TaskActivity[] }> => [
    {
      id: 'floor-1',
      activityChain: true as boolean | 'push',
      activities: [
        { id: 'w0', name: 'Стяжка', startDate: '2026-03-01', endDate: '2026-03-03' },
        { id: 'w1', name: 'Обои', startDate: '2026-03-04', endDate: '2026-03-06' },
      ],
    },
    {
      id: 'floor-2',
      activityChain: true as boolean | 'push',
      activities: [
        { id: 'w0', name: 'Стяжка', startDate: '2026-03-11', endDate: '2026-03-13' },
        { id: 'w1', name: 'Обои', startDate: '2026-03-21', endDate: '2026-03-23' },
      ],
    },
  ];

  it('fills gaps along the whole downstream when a work moves earlier', () => {
    const { shifts } = pushActivityChain(buildPushTasks(), 'floor-1', 'w0', -2);
    // Стяжка этажа 1 ушла влево: Обои этажа 1 подтянулись вплотную.
    const floor1 = shifts.find(shift => shift.taskId === 'floor-1')!;
    expect(floor1.deltas.get('w1')).toBe(-2);
    // Этаж 2: Стяжка заполняет промежуток за изменённой (-9), Обои за ней (-16) —
    // все промежутки вниз по цепочке схлопываются.
    const floor2 = shifts.find(shift => shift.taskId === 'floor-2')!;
    expect(floor2.deltas.get('w0')).toBe(-9);
    expect(floor2.deltas.get('w1')).toBe(-16);
  });

  it('pushes successors only after a collision', () => {
    // +5 дней: конец Стяжки этажа 2 = 18, до Обои 21 ещё запас — ничего не едет (зазор тянется).
    const slack = pushActivityChain(buildPushTasks(), 'floor-2', 'w0', 5);
    expect(slack.shifts).toEqual([]);

    // +10 дней: Стяжка этажа 2 дотянулась до Обои (21) — Обои вытолкнулась на 24.
    const collision = pushActivityChain(buildPushTasks(), 'floor-2', 'w0', 10);
    const floor2 = collision.shifts.find(shift => shift.taskId === 'floor-2')!;
    expect(floor2.deltas.get('w1')).toBe(3);
  });

  it('keeps the lag gap constant on both fill and push', () => {
    const tasks = buildPushTasks();
    tasks[1].activities![1].lag = 3;
    // Стяжка этажа 2 ушла влево на 2: Обои подтягиваются, держа зазор 3 (конец 11 + 3 = старт 14).
    const filled = pushActivityChain(tasks, 'floor-2', 'w0', -2);
    const floor2Filled = filled.shifts.find(shift => shift.taskId === 'floor-2')!;
    expect(floor2Filled.deltas.get('w1')).toBe(-6);

    // Стяжка вытолкнула Обои: старт 19, конец 21, зазор 3 → Обои на 24 (дельта +4).
    const pushed = pushActivityChain(tasks, 'floor-2', 'w0', 8);
    const floor2Pushed = pushed.shifts.find(shift => shift.taskId === 'floor-2')!;
    expect(floor2Pushed.deltas.get('w1')).toBe(4);
  });

  it('clamps the dragged start against incoming links', () => {
    const tasks = buildPushTasks();
    tasks[1].activities![1].lag = 3;
    // Обои этажа 2: входящие — Стяжка этажа 2 (конец 13) + лаг 3 → минимум 16; данные 21 → можно -4.
    expect(activityChainMinStartDelta(tasks, 'floor-2', 'w1')).toBe(-4);
    // Обои этажа 1: входящая Стяжка этажа 1 (конец 3) → минимум день 4; данные 4 → 0.
    expect(activityChainMinStartDelta(tasks, 'floor-1', 'w1')).toBe(0);
  });

  it('keeps the work lag on the same-floor link only (cross-floor link carries no lag)', () => {
    const tasks: Array<{ id: string; activityChain: boolean | 'push'; activities: TaskActivity[] }> = [
      {
        id: 'floor-1',
        activityChain: 'push',
        activities: [
          { id: 'w0', name: 'W0', startDate: '2026-03-01', endDate: '2026-03-03' },
          { id: 'w1', name: 'W1', startDate: '2026-03-10', endDate: '2026-03-14' },
        ],
      },
      {
        id: 'floor-2',
        activityChain: 'push',
        activities: [
          // Внутри строки зазор закрывается рано: конец 03-03 + лаг 4 → старт 03-08.
          { id: 'w0', name: 'W0', startDate: '2026-03-02', endDate: '2026-03-03' },
          // Та же работа этажом выше кончается 03-14; без лага минимум 03-15, а не 03-19.
          { id: 'w1', name: 'W1', startDate: '2026-03-20', endDate: '2026-03-22', lag: 4 },
        ],
      },
    ];
    const constraint = activityStartConstraint(tasks, 'floor-2', 'w1')!;
    expect(constraint.blockers).toEqual([{ taskId: 'floor-1', activityId: 'w1' }]);
    expect(constraint.lag).toBe(0);
    expect(activityChainMinStartDelta(tasks, 'floor-2', 'w1')).toBe(-5);
  });

  it('commits pushed followers after a live conveyor drag (push mode)', () => {
    const onTasksChange = vi.fn();
    // Этаж 1: w4 1–4, w5 7–10 (лаг 2). Этаж 2: та же лестница с запасом.
    const tasks: Task[] = [
      {
        id: 'floor-1', name: 'Этаж 1', startDate: '2026-03-01', endDate: '2026-03-10', activityChain: 'push',
        activities: [
          { id: 'w4', name: 'W4', startDate: '2026-03-01', endDate: '2026-03-04' },
          { id: 'w5', name: 'W5', startDate: '2026-03-07', endDate: '2026-03-10', lag: 2 },
        ],
      },
      {
        id: 'floor-2', name: 'Этаж 2', startDate: '2026-03-11', endDate: '2026-03-20', activityChain: 'push',
        activities: [
          { id: 'w4', name: 'W4', startDate: '2026-03-11', endDate: '2026-03-14' },
          { id: 'w5', name: 'W5', startDate: '2026-03-17', endDate: '2026-03-20', lag: 2 },
        ],
      },
    ];
    const { container } = render(
      <GanttChart tasks={tasks} onTasksChange={onTasksChange} dayWidth={40} rowHeight={40} containerHeight={400} businessDays={false} />
    );
    const dragged = container.querySelector<HTMLElement>('[data-gantt-task-row-id="floor-1"] [data-activity-id="w4"]')!;
    const w5 = () => container.querySelector<HTMLElement>('[data-gantt-task-row-id="floor-1"] [data-activity-id="w5"]')!;
    const w4floor2 = () => container.querySelector<HTMLElement>('[data-gantt-task-row-id="floor-2"] [data-activity-id="w4"]')!;
    const w5Before = parseInt(w5().style.left, 10);

    // +2 дня: конец w4 пересекает старт w5 - лаг → w5 выталкивается в реальном времени.
    fireEvent.mouseDown(dragged, { clientX: 500, clientY: 20 });
    fireEvent.mouseMove(window, { clientX: 580, clientY: 20 });
    expect(parseInt(w5().style.left, 10)).toBe(w5Before + 80);

    fireEvent.mouseUp(window);
    expect(onTasksChange).toHaveBeenCalledTimes(1);
    const changed = onTasksChange.mock.calls[0][0] as Task[];
    const floor1 = changed.find(task => task.id === 'floor-1')!;
    expect(floor1.activities!.find(activity => activity.id === 'w4')!.startDate).toBe('2026-03-03');
    expect(floor1.activities!.find(activity => activity.id === 'w5')!.startDate).toBe('2026-03-09');
    // Этаж 2 имеет запас 7 дней: зазор тянется — ничего не поехало (отличие от жёсткого режима).
    expect(changed.find(task => task.id === 'floor-2')).toBeUndefined();
  });

  it('renders gap arrows between sequential works of one lane', () => {
    const tasks: Task[] = [{
      id: 'floor-1',
      name: 'Этаж 1',
      startDate: '2026-03-01',
      endDate: '2026-03-10',
      activities: [
        { id: 'a', name: 'A', startDate: '2026-03-01', endDate: '2026-03-03' },
        // Зазор 2 дня → стрелка.
        { id: 'b', name: 'B', startDate: '2026-03-06', endDate: '2026-03-08' },
        // Вплотную → стрелки нет.
        { id: 'c', name: 'C', startDate: '2026-03-09', endDate: '2026-03-10' },
      ],
    }];
    const { container } = render(
      <GanttChart tasks={tasks} dayWidth={40} rowHeight={40} containerHeight={200} businessDays={false} />
    );
    const arrows = container.querySelectorAll('.gantt-tr-activityLink');
    expect(arrows).toHaveLength(1);
    expect(parseInt((arrows[0] as HTMLElement).style.width, 10)).toBe(80); // 2 дня × 40px
  });

  it('labels a lag gap with its day count', () => {
    const tasks: Task[] = [{
      id: 'floor-1',
      name: 'Этаж 1',
      startDate: '2026-03-01',
      endDate: '2026-03-10',
      activities: [
        { id: 'a', name: 'A', startDate: '2026-03-01', endDate: '2026-03-03' },
        // Лаг 2 дня — постоянный технологический зазор перед стартом B.
        { id: 'b', name: 'B', startDate: '2026-03-06', endDate: '2026-03-08', lag: 2 },
      ],
    }];
    const { container } = render(
      <GanttChart tasks={tasks} dayWidth={40} rowHeight={40} containerHeight={200} businessDays={false} />
    );
    const label = container.querySelector<HTMLElement>('.gantt-tr-activityLag');
    expect(label).not.toBeNull();
    // Подпись в стиле лаг-подписи связей: «+N», без кружка.
    expect(label!.textContent).toBe('+2');
    expect(label!.title).toBe('Зазор 2 д');
    // Стоит у острия стрелки: конец связи минус 14px.
    const arrow = container.querySelector<HTMLElement>('.gantt-tr-activityLink')!;
    expect(parseInt(label!.style.left, 10)).toBe(parseInt(arrow.style.left, 10) + parseInt(arrow.style.width, 10) - 14);
  });

  it('shows the lag as a tooltip field when it is not overridden', () => {
    const tasks: Task[] = [{
      id: 'floor-1',
      name: 'Этаж 1',
      startDate: '2026-03-01',
      endDate: '2026-03-10',
      activities: [
        { id: 'b', name: 'B', startDate: '2026-03-06', endDate: '2026-03-08', lag: 2 },
      ],
    }];
    const { container } = render(
      <GanttChart tasks={tasks} dayWidth={40} rowHeight={40} containerHeight={200} businessDays={false} />
    );
    const bar = container.querySelector<HTMLElement>('[data-activity-id="b"]')!;
    fireEvent.mouseEnter(bar, { clientX: 300, clientY: 20 });
    // Зазор уходит в нативный title полосы, подсказка остаётся узкой.
    expect(bar.getAttribute('title')).toContain('Зазор: 2 д');
    expect(document.querySelector('.gantt-tr-activityTip')!.textContent).toBe('B');
  });

  it('stops the dragged bar at the blocking predecessor live (no drop rollback)', () => {
    const onTasksChange = vi.fn();
    const tasks: Task[] = [
      {
        id: 'floor-1', name: 'Этаж 1', startDate: '2026-03-01', endDate: '2026-03-10', activityChain: 'push',
        activities: [
          { id: 'w4', name: 'W4', startDate: '2026-03-01', endDate: '2026-03-04' },
          { id: 'w5', name: 'W5', startDate: '2026-03-07', endDate: '2026-03-10', lag: 2 },
        ],
      },
      {
        id: 'floor-2', name: 'Этаж 2', startDate: '2026-03-11', endDate: '2026-03-21', activityChain: 'push',
        activities: [
          { id: 'w4', name: 'W4', startDate: '2026-03-11', endDate: '2026-03-14' },
          // Старт 18 → минимум 17 (конец W4 этажа 2 + лаг 2) → можно влево на 1 день.
          { id: 'w5', name: 'W5', startDate: '2026-03-18', endDate: '2026-03-21', lag: 2 },
        ],
      },
    ];
    const { container } = render(
      <GanttChart tasks={tasks} onTasksChange={onTasksChange} dayWidth={40} rowHeight={40} containerHeight={400} businessDays={false} />
    );
    const dragged = container.querySelector<HTMLElement>('[data-gantt-task-row-id="floor-2"] [data-activity-id="w5"]')!;
    const blocker = container.querySelector<HTMLElement>('[data-gantt-task-row-id="floor-2"] [data-activity-id="w4"]')!;
    const before = parseInt(dragged.style.left, 10);

    // Просим -3 дня, но связь пускает ровно на 1 день влево.
    fireEvent.mouseDown(dragged, { clientX: 500, clientY: 20 });
    fireEvent.mouseMove(window, { clientX: 380, clientY: 20 });

    expect(parseInt(dragged.style.left, 10)).toBe(before - 40);
    expect(dragged.className).toContain('gantt-tr-activityBar-atLimit');
    expect(blocker.className).toContain('gantt-tr-activityBar-blocking');

    fireEvent.mouseUp(window);
    // На отпускании полоса не откатывается: фиксируется достигнутый предел.
    const floor2 = (onTasksChange.mock.calls[0][0] as Task[]).find(task => task.id === 'floor-2')!;
    expect(floor2.activities!.find(activity => activity.id === 'w5')!.startDate).toBe('2026-03-17');
  });

  it('leaves a non-chained activity free to move past its lane neighbours', () => {
    const onTasksChange = vi.fn();
    const tasks: Task[] = [{
      id: 'floor-1', name: 'Этаж 1', startDate: '2026-03-01', endDate: '2026-03-10',
      activities: [
        { id: 'a', name: 'A', startDate: '2026-03-01', endDate: '2026-03-03' },
        { id: 'b', name: 'B', startDate: '2026-03-06', endDate: '2026-03-08', lag: 2 },
      ],
    }];
    const { container } = render(
      <GanttChart tasks={tasks} onTasksChange={onTasksChange} dayWidth={40} rowHeight={40} containerHeight={200} businessDays={false} />
    );
    const bar = container.querySelector<HTMLElement>('[data-activity-id="b"]')!;
    const before = parseInt(bar.style.left, 10);
    fireEvent.mouseDown(bar, { clientX: 500, clientY: 20 });
    fireEvent.mouseMove(window, { clientX: 380, clientY: 20 });
    expect(parseInt(bar.style.left, 10)).toBe(before - 120);
    expect(bar.className).not.toContain('gantt-tr-activityBar-atLimit');
    fireEvent.mouseUp(window);
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
    // Узкая подсказка — только имя; настраиваемые поля уходят в нативный title полосы.
    expect(tip!.querySelector('.gantt-tr-activityTipField')).toBeNull();
    expect(bar.getAttribute('title')).toContain('ООО СК Строй');
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
    // Узкая подсказка — одна строка с названием.
    expect(tip!.textContent).toBe('Обои');
    expect(tip!.querySelector('.gantt-tr-activityTipName')?.textContent).toBe('Обои');
    // Даты и длительность — в нативном title полосы.
    expect(bar.getAttribute('title')).toContain('5 д');

    fireEvent.mouseLeave(bar);
    expect(document.querySelector('.gantt-tr-activityTip')).toBeNull();
  });

  it('suppresses hover tooltips elsewhere while an activity is dragged', () => {
    const tasks: Task[] = [
      {
        id: 'floor-1', name: 'Этаж 1', startDate: '2026-03-01', endDate: '2026-03-05',
        activities: [{ id: 'a', name: 'A1', startDate: '2026-03-01', endDate: '2026-03-02' }],
      },
      {
        id: 'floor-2', name: 'Этаж 2', startDate: '2026-03-03', endDate: '2026-03-06',
        activities: [{ id: 'b', name: 'B2', startDate: '2026-03-03', endDate: '2026-03-04' }],
      },
    ];
    const { container } = render(
      <GanttChart tasks={tasks} dayWidth={40} rowHeight={40} containerHeight={300} businessDays={false} />
    );
    const dragged = container.querySelector<HTMLElement>('[data-gantt-task-row-id="floor-1"] [data-activity-id="a"]')!;
    const other = container.querySelector<HTMLElement>('[data-gantt-task-row-id="floor-2"] [data-activity-id="b"]')!;

    fireEvent.mouseDown(dragged, { clientX: 500, clientY: 20 });
    fireEvent.mouseMove(window, { clientX: 540, clientY: 20 });
    // Наведение на работу другой строки не открывает вторую подсказку.
    fireEvent.mouseEnter(other, { clientX: 300, clientY: 60 });

    const tips = document.querySelectorAll('.gantt-tr-activityTip');
    expect(tips).toHaveLength(1);
    expect(tips[0].textContent).toContain('A1');

    fireEvent.mouseUp(window);
    // После переноса подсказка скрыта, а не висит на экране.
    expect(document.querySelectorAll('.gantt-tr-activityTip')).toHaveLength(0);
  });
});
