"use client";

import { useCallback, useMemo, useState } from "react";
import { GanttChart, type Task, type ActivityTooltipContext } from "gantt-lib";

const EPOCH = Date.UTC(2026, 2, 2); // пн 2 мар 2026
const FLOORS = 25;
const WORKS_PER_FLOOR = 40;
const CONTRACTORS = ["СК Строй", "Отделка-Профи", "МонтажСервис", "РемМастер", "СтройГарант"];

// ── Наборы цветов ─────────────────────────────────────────────────────────
// Стандартные, проверенно различимые шкалы: последовательные палитры
// matplotlib (viridis / plasma / inferno / cividis), дивергентная ColorBrewer
// PuOr (фиолетово-оранжевая с коричневыми), категориальные Tableau 10 и
// ColorBrewer Set3, плюс «радуга» по кругу тона. Последовательные шкалы
// раскладываются по работам этажа спокойной градацией без радужного «шума».
const mixHex = (a: string, b: string, t: number): string => {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  const mixed = pa.map((value, i) => Math.round(value + (pb[i] - value) * t));
  return `#${mixed.map(value => value.toString(16).padStart(2, "0")).join("")}`;
};

// Фиолетовый → бордовый → коричневый → золото (пример «как в Excel»).
const SUNSET = ["#3F1D6B", "#5E2A8C", "#8A3F7A", "#A85A4A", "#B77A2E", "#D2A52A", "#EAD24A"];
const PLASMA = ["#0D0887", "#46039F", "#7201A8", "#9C179E", "#BD3786", "#D8576B", "#ED7953", "#FB9F3A", "#FDCA26", "#F0F921"];
const INFERNO = ["#000004", "#1B0C41", "#4A0C6B", "#781C6D", "#A52C60", "#CF4446", "#ED6925", "#FB9A06", "#F7D03C", "#FCFFA4"];
const VIRIDIS = ["#440154", "#482878", "#3E4A89", "#31688E", "#26828E", "#1F9E89", "#35B779", "#6DCD59", "#B4DE2C", "#FDE725"];
const CIVIDIS = ["#00204D", "#00306F", "#39486B", "#575D6D", "#707173", "#8A8779", "#A69D75", "#C4B56C", "#E4CF5B", "#FFEA46"];
const PUOR = ["#2D004B", "#542788", "#8073AC", "#B2ABD2", "#D8DAEB", "#F7F7F7", "#FEE0B6", "#FDB863", "#E08214", "#B35806", "#7F3B08"];
const TABLEAU10 = ["#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F", "#EDC948", "#B07AA1", "#FF9DA7", "#9C755F", "#BAB0AC"];
const SET3 = ["#8DD3C7", "#FFFFB3", "#BEBADA", "#FB8072", "#80B1D3", "#FDB462", "#B3DE69", "#FCCDE5", "#D9D9D9", "#BC80BD", "#CCEBC5", "#FFED6F"];

/** Тон hex-цвета (0–360) — чтобы разложить набор по радуге. */
const hueOf = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue *= 60;
  return hue < 0 ? hue + 360 : hue;
};
const rainbowOrder = (colors: string[]): string[] => [...colors].sort((a, b) => hueOf(a) - hueOf(b));

/** Вставить по `perGap` интерполированных оттенков между соседними цветами. */
const extendRamp = (colors: string[], perGap: number): string[] => {
  const extended: string[] = [];
  for (let index = 0; index < colors.length; index += 1) {
    extended.push(colors[index]);
    if (index < colors.length - 1) {
      for (let step = 1; step <= perGap; step += 1) {
        extended.push(mixHex(colors[index], colors[index + 1], step / (perGap + 1)));
      }
    }
  }
  return extended;
};

// Tableau 10, разложенный по радуге, с двумя промежуточными оттенками в каждом
// стыке; в конец — холодный серый, чтобы расширить шкалу.
const TABLEAU_EXTENDED = [...extendRamp(rainbowOrder(TABLEAU10), 2), "#6B7A99"];

const PALETTES: Array<{ key: string; label: string; anchors?: string[]; fixed?: string[]; hue?: boolean }> = [
  { key: "sunset", label: "Закат: фиолетовый → коричневый → золото", anchors: SUNSET },
  { key: "plasma", label: "Plasma: фиолетово-жёлтая (matplotlib)", anchors: PLASMA },
  { key: "inferno", label: "Inferno: фиолетово-огненная (matplotlib)", anchors: INFERNO },
  { key: "viridis", label: "Viridis: сине-зелёно-жёлтая (matplotlib)", anchors: VIRIDIS },
  { key: "cividis", label: "Cividis: сине-жёлтая, дальтоник-френдли", anchors: CIVIDIS },
  { key: "puor", label: "PuOr: фиолетово-оранжевая (ColorBrewer)", anchors: PUOR },
  { key: "tableau", label: "Tableau 10: категориальная", fixed: TABLEAU10 },
  { key: "tableau-rainbow", label: "Tableau 10 по радуге", fixed: rainbowOrder(TABLEAU10) },
  { key: "tableau-extended", label: "Tableau 10 расширенная (интерполяция + серый)", fixed: TABLEAU_EXTENDED },
  { key: "set3", label: "Set3: пастельная (ColorBrewer)", fixed: SET3 },
  { key: "rainbow", label: "Радуга: тон по кругу", hue: true },
];

const MIN_COLOR_STEPS = 4;
const MAX_COLOR_STEPS = 32;

/**
 * Развернуть набор в нужное число цветов. «Замкнутая» палитра сэмплируется по
 * кругу — тогда переход от последнего цвета к первому такой же плавный, как и
 * между соседними (нет шва на стыке повтора).
 */
const paletteColors = (
  palette: (typeof PALETTES)[number],
  steps: number,
  loop: boolean,
): string[] => {
  const count = Math.max(MIN_COLOR_STEPS, Math.min(MAX_COLOR_STEPS, Math.round(steps)));
  if (palette.fixed) {
    return palette.fixed.slice(0, Math.max(2, Math.min(count, palette.fixed.length)));
  }
  if (palette.hue) {
    const divisor = loop ? count : Math.max(1, count - 1);
    return Array.from({ length: count }, (_, index) => `oklch(0.6 0.17 ${Math.round((index / divisor) * 360)})`);
  }
  const anchors = palette.anchors ?? [];
  const sequence = loop ? [...anchors, anchors[0]] : anchors;
  const span = sequence.length - 1;
  return Array.from({ length: count }, (_, index) => {
    if (span <= 0) return sequence[0];
    const pos = loop
      ? (index / count) * span
      : (index / (count - 1)) * span;
    const lo = Math.floor(pos);
    const hi = Math.min(span, lo + 1);
    return mixHex(sequence[lo], sequence[hi], pos - lo);
  });
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
function buildConveyor(mode: "rigid" | "push", colors: string[]): { tasks: Task[]; totalDays: number } {
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
      color: colors[work % colors.length],
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
  const [paletteKey, setPaletteKey] = useState("sunset");
  const palette = PALETTES.find(item => item.key === paletteKey) ?? PALETTES[0];
  const [colorSteps, setColorSteps] = useState(18);
  const [loopPalette, setLoopPalette] = useState(true);
  const colors = useMemo(
    () => paletteColors(palette, colorSteps, loopPalette),
    [palette, colorSteps, loopPalette],
  );
  const [dataset, setDataset] = useState(() => buildConveyor("rigid", paletteColors(PALETTES[0], 18, true)));
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
      setDataset(buildConveyor(next, colors));
      return next;
    });
  }, [colors]);

  const changePalette = useCallback((key: string) => {
    const next = PALETTES.find(item => item.key === key) ?? PALETTES[0];
    setPaletteKey(next.key);
    setDataset(buildConveyor(mode, paletteColors(next, colorSteps, loopPalette)));
  }, [mode, colorSteps, loopPalette]);

  const changeColorSteps = useCallback((value: number) => {
    const next = Math.max(MIN_COLOR_STEPS, Math.min(MAX_COLOR_STEPS, Math.round(value)));
    setColorSteps(next);
    setDataset(buildConveyor(mode, paletteColors(palette, next, loopPalette)));
  }, [mode, palette, loopPalette]);

  // Универсальная подсказка: базово «этаж · работа», сверху дописываем даты и длительность.
  const renderActivityTooltip = useCallback((context: ActivityTooltipContext) => {
    const format = (date: Date) => `${String(date.getUTCDate()).padStart(2, "0")}.${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return `${format(context.startDate)} – ${format(context.endDate)} · ${context.durationDays} д`;
  }, []);

  const toggleLoopPalette = useCallback(() => {
    setLoopPalette(current => {
      const next = !current;
      setDataset(buildConveyor(mode, paletteColors(palette, colorSteps, next)));
      return next;
    });
  }, [mode, palette, colorSteps]);

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
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0, fontSize: 13 }}>
          Палитра:
          <select
            value={paletteKey}
            onChange={event => changePalette(event.target.value)}
            style={{ fontSize: 13, padding: "4px 6px" }}
          >
            {PALETTES.map(item => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0, fontSize: 13 }}>
          Шаг цвета:
          <input
            type="number"
            min={MIN_COLOR_STEPS}
            max={MAX_COLOR_STEPS}
            step={1}
            value={colorSteps}
            onChange={event => changeColorSteps(Number(event.target.value))}
            style={{ width: 58, fontSize: 13, padding: "3px 6px" }}
          />
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0, fontSize: 13 }}>
          <input type="checkbox" checked={loopPalette} onChange={toggleLoopPalette} />
          Замыкать палитру (плавный стык повтора)
        </label>
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
          activityClickToDrag
          activityActivationMode="dim"
          activityTooltip={renderActivityTooltip}
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
