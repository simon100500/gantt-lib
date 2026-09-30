import '@testing-library/jest-dom/vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';

const DAY_WIDTH = 40;

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0) as unknown as number);
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    window.clearTimeout(id);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockBarRect(bar: HTMLElement, width: number) {
  Object.defineProperty(bar, 'getBoundingClientRect', {
    value: () => ({ left: 0, width, right: width, top: 0, height: 40, bottom: 40 }),
    writable: false,
    configurable: true,
  });
}

const getBar = (container: HTMLElement, taskId: string) =>
  container.querySelector<HTMLElement>(`[data-gantt-task-row-id="${taskId}"] [data-taskbar]`)!;

/**
 * Родитель-локация (Секция) двигается — дети (Этажи) едут ПАРАЛЛЕЛЬНО, вместе
 * со своими видимыми работами (activities). Без этого даты детей менялись бы,
 * а полосы работ визуально стояли на месте.
 */
describe('parent bar drag moves child activities in parallel', () => {
  const tasks: Task[] = [
    { id: 'section', name: 'Секция 1', startDate: '2026-03-01', endDate: '2026-03-10' },
    {
      id: 'f1', name: 'Этаж 1', parentId: 'section', startDate: '2026-03-01', endDate: '2026-03-05',
      activities: [
        { id: 'w0', name: 'Работа 1', startDate: '2026-03-01', endDate: '2026-03-03' },
        { id: 'w1', name: 'Работа 2', startDate: '2026-03-04', endDate: '2026-03-05' },
      ],
    },
    {
      id: 'f2', name: 'Этаж 2', parentId: 'section', startDate: '2026-03-04', endDate: '2026-03-10',
      activities: [
        { id: 'w0', name: 'Работа 1', startDate: '2026-03-04', endDate: '2026-03-06' },
      ],
    },
  ];

  it('shifts every floor row and its works by the same delta', async () => {
    const onTasksChange = vi.fn();
    const { container } = render(
      <GanttChart
        tasks={tasks}
        dayWidth={DAY_WIDTH}
        rowHeight={40}
        headerHeight={36}
        businessDays={false}
        onTasksChange={onTasksChange}
      />
    );

    const parentBar = getBar(container, 'section');
    mockBarRect(parentBar, 10 * DAY_WIDTH);
    // Тянем за середину — это перенос, а не растягивание края.
    fireEvent.mouseDown(parentBar, { clientX: 5 * DAY_WIDTH, clientY: 20, button: 0 });
    fireEvent.mouseMove(window, { clientX: 7 * DAY_WIDTH, clientY: 20 });
    await waitFor(() => expect(parentBar).toHaveClass('gantt-tr-dragging'));
    fireEvent.mouseUp(window, { clientX: 7 * DAY_WIDTH, clientY: 20 });

    await waitFor(() => expect(onTasksChange).toHaveBeenCalledTimes(1));

    const batch = onTasksChange.mock.calls[0][0] as Task[];
    const byId = new Map(batch.map(task => [task.id, task]));

    // Секция уехала на +2 дня.
    expect(byId.get('section')!.startDate).toBe('2026-03-03');

    // Оба этажа сдвинулись на ту же дельту.
    const f1 = byId.get('f1')!;
    expect(f1.startDate).toBe('2026-03-03');
    expect(f1.endDate).toBe('2026-03-07');
    // Границы строки выводятся из её работ: f2 охватывает только 04–06 (+2 = 06–08).
    const f2 = byId.get('f2')!;
    expect(f2.startDate).toBe('2026-03-06');
    expect(f2.endDate).toBe('2026-03-08');

    // И их видимые работы — тоже (параллельно, внутренние зазоры сохранены).
    expect(f1.activities!.map(a => [a.startDate, a.endDate])).toEqual([
      ['2026-03-03', '2026-03-05'],
      ['2026-03-06', '2026-03-07'],
    ]);
    expect(f2.activities!.map(a => [a.startDate, a.endDate])).toEqual([
      ['2026-03-06', '2026-03-08'],
    ]);
  });
});
