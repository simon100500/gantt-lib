"use client";

import { useCallback, useState } from "react";
import { GanttChart, type Task } from "gantt-lib";

const EPOCH = Date.UTC(2026, 2, 2); // пн 2 мар 2026
const FLOORS = 25;
const WORKS_PER_FLOOR = 40;
const CONTRACTORS = ["СК Строй", "Отделка-Профи", "МонтажСервис", "РемМастер", "СтройГарант"];

// Плавная шкала: соседние работы отличаются тоном на один шаг и не разлетаются
// по комплементарным цветам. Яркость чередуется в шахматном порядке — соседние
// работы заметно разные, но строка остаётся ровной; повтор через HUE_STEPS работ.
const HUE_STEPS = 18;
const activityColor = (work: number): string => {
  const step = work % HUE_STEPS;
  const hue = Math.round(step * (360 / HUE_STEPS));
  const lightness = step % 2 === 0 ? 0.46 : 0.62;
  return `oklch(${lightness} 0.15 ${hue})`;
};

// Детерминированный PRNG: одинаковые данные на сервере и клиенте (без hydration-мисматчей).
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const day = (offset: number) => new Date(EPOCH + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * Невидимые связи двух направлений, зашитые в расписание:
 *  1) последовательно по работам этажа: start(K, i) >= end(K, i-1) + lag(i);
 *  2) та же работа между этажами: start(K, i) >= end(K-1, i) —
 *     на следующем этаже нельзя начать, пока предыдущий не закончил.
 * В режиме «выталкивания» часть работ получает лаг (технологический зазор
 * перед работой на своём этаже).
 */
function buildConveyor(mode: "rigid" | "push"): { tasks: Task[]; totalDays: number } {
  const rand = mulberry32(20260302);
  const lagFor = (work: number) => (mode === "push" && work % 9 === 4 ? 2 : 0);
  const durations: number[][] = Array.from({ length: FLOORS }, () =>
    Array.from({ length: WORKS_PER_FLOOR }, () => 3 + Math.floor(rand() * 8)),
  );
  const starts: number[][] = [];
  let totalDays = 0;
  for (let floor = 0; floor < FLOORS; floor += 1) {
    starts[floor] = [];
    for (let work = 0; work < WORKS_PER_FLOOR; work += 1) {
      const afterPreviousWork = work > 0 ? starts[floor][work - 1] + durations[floor][work - 1] + lagFor(work) : 0;
      const afterSameWorkAbove = floor > 0 ? starts[floor - 1][work] + durations[floor - 1][work] : 0;
      starts[floor][work] = Math.max(afterPreviousWork, afterSameWorkAbove);
    }
    totalDays = Math.max(totalDays, starts[floor][WORKS_PER_FLOOR - 1] + durations[floor][WORKS_PER_FLOOR - 1]);
  }

  const tasks: Task[] = Array.from({ length: FLOORS }, (_, floor) => ({
    id: `floor-${floor + 1}`,
    name: `Этаж ${floor + 1}`,
    startDate: day(starts[floor][0]),
    endDate: day(starts[floor][WORKS_PER_FLOOR - 1] + durations[floor][WORKS_PER_FLOOR - 1] - 1),
    activityChain: mode === "push" ? "push" : true,
    activities: Array.from({ length: WORKS_PER_FLOOR }, (_, work) => ({
      id: `w${work + 1}`,
      name: `Работа ${work + 1}`,
      startDate: day(starts[floor][work]),
      endDate: day(starts[floor][work] + durations[floor][work] - 1),
      color: activityColor(work),
      lag: lagFor(work) || undefined,
      tooltipFields: [
        { label: "Подрядчик", value: CONTRACTORS[(floor + work) % CONTRACTORS.length] },
        { label: "Длительность", value: `${durations[floor][work]} д` },
        ...(lagFor(work) ? [{ label: "Зазор", value: `${lagFor(work)} д (технология)` }] : []),
      ],
    })),
  }));

  return { tasks, totalDays };
}

export default function FlowLineStressDemo() {
  const [mode, setMode] = useState<"rigid" | "push">("rigid");
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [dataset, setDataset] = useState(() => buildConveyor("rigid"));
  const tasks = dataset.tasks;
  // Стандартные ширины сайта: день — рабочий размер, неделя/месяц — обзорные.
  const dayWidth = viewMode === "month" ? 2.5 : viewMode === "week" ? 8 : 24;

  const handleTasksChange = useCallback((changed: Task[]) => {
    setDataset(current => ({
      ...current,
      tasks: current.tasks.map(task => {
        const update = changed.find(item => item.id === task.id);
        return update ? { ...task, ...update } : task;
      }),
    }));
  }, []);

  const toggleMode = useCallback(() => {
    setMode(current => {
      const next = current === "rigid" ? "push" : "rigid";
      setDataset(buildConveyor(next));
      return next;
    });
  }, []);

  return (
    <section className="demo-section" id="flow-line-stress">
      <h2 className="demo-section-title">Конвейер 25 этажей × 40 работ (1000 полос)</h2>
      <p className="demo-section-desc">
        Каждая строка — этаж (1…25 сверху вниз), внутри 40 последовательных работ с длительностями
        3–10 дней. Невидимые связи двух направлений: работа следует за предыдущей на своём этаже и
        за той же работой этажом выше — ниже нельзя начать, пока выше не закончили.
        Наведи курсор — подсказка с подрядчиком; зазор между полосами подсвечен стрелкой,
        лаг подписан числом дней. В режиме «выталкивания» полоса упирается в предшественника
        и останавливается на зазоре.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, margin: "0 0 8px" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0, fontSize: 13 }}>
          <input type="checkbox" checked={mode === "push"} onChange={toggleMode} />
          Режим «выталкивания» (<code>activityChain: &apos;push&apos;</code>): промежутки заполняются
          (как можно раньше), сдвижка — только после коллизии; у каждой 5-й работы лаг 2 дня —
          зазор постоянный. Данные пересобираются под режим.
        </label>
        <div style={{ display: "inline-flex", gap: 6 }}>
          <button
            className={`demo-btn ${viewMode === "day" ? "demo-btn-active" : "demo-btn-muted"}`}
            onClick={() => setViewMode("day")}
          >
            По дням
          </button>
          <button
            className={`demo-btn ${viewMode === "week" ? "demo-btn-active" : "demo-btn-muted"}`}
            onClick={() => setViewMode("week")}
          >
            По неделям
          </button>
          <button
            className={`demo-btn ${viewMode === "month" ? "demo-btn-active" : "demo-btn-muted"}`}
            onClick={() => setViewMode("month")}
          >
            По месяцам
          </button>
        </div>
      </div>
      <div className="demo-chart-card">
        <GanttChart
          tasks={tasks}
          onTasksChange={handleTasksChange}
          showTaskList
          showChart
          businessDays={false}
          dateRange={{ start: new Date(EPOCH - 7 * 24 * 60 * 60 * 1000), end: new Date(EPOCH + (dataset.totalDays + 10) * 24 * 60 * 60 * 1000) }}
          dayWidth={dayWidth}
          viewMode={viewMode}
          rowHeight={40}
          taskListWidth={150}
          hiddenTaskListColumns={["startDate", "endDate", "duration", "dependencies", "progress"]}
          showTaskDateLabels={false}
          showTaskNames={false}
          containerHeight={900}
        />
      </div>
    </section>
  );
}
