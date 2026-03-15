# Phase 20: month-view - Research

**Researched:** 2026-03-16
**Domain:** React Gantt chart — week-view mode (alternative timeline scale)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**API переключателя:**
- Пропс `viewMode?: 'day' | 'week'`, значение по умолчанию `'day'`
- Без встроенного UI-переключателя — родительский компонент управляет состоянием сам
- При отсутствии пропса поведение не меняется (обратная совместимость)

**Единица сетки в week-view:**
- Каждый столбец = 1 неделя
- Ширина столбца = `dayWidth × 7` (используется тот же пропс `dayWidth`, что в day-view)
- При dayWidth=7px неделя = 49px; рекомендуемое значение dayWidth для week-view ~7–8px

**Заголовок в week-view (2 строки):**
- Строка 1: название месяца + год («Март 2026»), спан по неделям этого месяца
- Строка 2: дата начала недели — число месяца (01, 08, 15, 22, 29…)
- Высота заголовка аналогична day-view (`headerHeight` пропс)

**Перетаскивание в week-view:**
- Drag-and-drop работает в полной мере
- Привязка к дню — смещение вычисляется из пиксельной позиции через `dayWidth`
- Даты сохраняются точно, без округления до начала недели

**Сетка week-view:**
- Тонкие вертикальные линии между неделями (аналогично разделителям дней в day-view)
- Яркие разделители на границах месяцев (аналогично текущим разделителям месяцев)
- Вертикальная линия сегодняшнего дня (TodayIndicator адаптируется к week-view)
- Выходные дни не выделяются (нет подсветки, т.к. столбец = неделя)

### Claude's Discretion
- Обработка «неполных» недель на границах месяцев (первая/последняя неделя)
- Точный CSS для разделителей месяцев в week-view
- Адаптация TodayIndicator под недельную ширину столбца

### Deferred Ideas (OUT OF SCOPE)
- Масштаб «квартал» / «год» (каждый столбец = квартал или месяц)
- Полноценный switcher с 3+ масштабами (день / неделя / месяц / квартал)
- Зум колёсиком мыши для плавного переключения масштабов
</user_constraints>

---

## Summary

Phase 20 adds a `viewMode?: 'day' | 'week'` prop to `GanttChart`. In week-view each logical column represents 7 days with pixel width `dayWidth * 7`. The underlying `days: Date[]` array from `getMultiMonthDays` remains unchanged — it still lists individual days — but rendering logic uses a step of 7.

The main areas of change are: (1) `TimeScaleHeader` — branch that shows week starts instead of individual days; (2) `GridBackground` — draw lines every 7 days (week boundary) instead of every day, skip weekend highlighting; (3) `TodayIndicator` — pixel math is unchanged since it already uses `dayWidth` per day; (4) `dateUtils.ts` — two new pure utility functions (`getWeekSpans`, `getWeekStartDays`); (5) `GanttChart` — accept and thread `viewMode` prop through to child components.

Drag-and-drop requires no logic changes: `useTaskDrag` already works pixel-by-pixel via `dayWidth`; tasks snap to day boundaries, which is the intended behavior. The `TaskRow` positioning (`calculateTaskBar`, `pixelsToDate`) is also fully day-based and requires no modification.

**Primary recommendation:** Implement as a thin "rendering mode" switch. Reuse 100% of existing date/pixel math; add only the week-grouping utilities and conditional rendering branches.

---

## Standard Stack

### Core (already in project, no new deps)
| Library | Version | Purpose | Note |
|---------|---------|---------|------|
| React | existing | Component tree | `React.memo` pattern already in use |
| date-fns | existing | `format(date, 'LLLL yyyy', { locale: ru })` | Already used in TimeScaleHeader for month labels |
| date-fns/locale/ru | existing | Russian locale | Already imported in TimeScaleHeader |
| vitest | existing | Unit tests | Config at `packages/gantt-lib/vitest.config.ts` |

No new dependencies needed. All required functionality already exists in the stack.

### Installation
```bash
# No new packages to install
```

---

## Architecture Patterns

### Recommended Project Structure

```
packages/gantt-lib/src/
├── utils/
│   └── dateUtils.ts           # ADD: getWeekSpans(), getWeekStartDays()
├── components/
│   ├── GanttChart/
│   │   └── GanttChart.tsx     # ADD: viewMode prop, thread to children
│   ├── TimeScaleHeader/
│   │   └── TimeScaleHeader.tsx # ADD: week-view branch
│   ├── GridBackground/
│   │   └── GridBackground.tsx  # ADD: viewMode prop, skip weekends in week-view
│   └── TodayIndicator/
│       └── TodayIndicator.tsx  # No change needed (math already correct)
└── __tests__/
    └── dateUtils.test.ts       # ADD: tests for getWeekSpans, getWeekStartDays
```

### Pattern 1: Prop Threading (viewMode flows top-down)

`GanttChart` accepts `viewMode` and passes it down to:
- `TimeScaleHeader` (controls row 2 content)
- `GridBackground` (controls line step and weekend rendering)

`TaskRow` and `useTaskDrag` do NOT need `viewMode` — they work in days always.

```typescript
// GanttChart.tsx — add to GanttChartProps
viewMode?: 'day' | 'week';

// Thread to children:
<TimeScaleHeader days={dateRange} dayWidth={dayWidth} headerHeight={headerHeight} viewMode={viewMode} />
<GridBackground dateRange={dateRange} dayWidth={dayWidth} totalHeight={totalGridHeight} viewMode={viewMode} />
```

### Pattern 2: Week Utility Functions

Two new pure functions in `dateUtils.ts`, modelled after the existing `getMonthSpans`:

```typescript
// WeekSpan for TimeScaleHeader row 1 (month label spanning N weeks)
export interface WeekSpan {
  month: Date;      // first day of month (UTC)
  weeks: number;    // how many week-columns this month occupies in the visible range
  startIndex: number; // index in the weeks array
}

/**
 * Group the days array into week-columns and calculate month spans over those weeks.
 * Used by TimeScaleHeader row 1 in week-view.
 *
 * A "week" here is defined as: the 7-day block starting from days[0], days[7], days[14]...
 * NOT necessarily starting on Monday. This matches the locked decision
 * "каждый столбец = 1 неделя" (each column = 1 week relative to the date range start).
 */
export const getWeekSpans = (days: Date[]): WeekSpan[] => {
  // ... groups days by 7, counts how many week-columns fall in each calendar month
};

/**
 * Return the first day of each 7-day block in the days array.
 * Used by TimeScaleHeader row 2 in week-view.
 * Returns dates formatted as day-of-month (01, 08, 15, 22, 29...)
 */
export const getWeekStartDays = (days: Date[]): Date[] => {
  const result: Date[] = [];
  for (let i = 0; i < days.length; i += 7) {
    result.push(days[i]);
  }
  return result;
};
```

### Pattern 3: TimeScaleHeader Week Branch

```typescript
// TimeScaleHeader.tsx — add viewMode prop and conditional rendering
const weekStartDays = useMemo(
  () => viewMode === 'week' ? getWeekStartDays(days) : [],
  [days, viewMode]
);
const weekSpans = useMemo(
  () => viewMode === 'week' ? getWeekSpans(days) : [],
  [days, viewMode]
);

const weekColumnWidth = dayWidth * 7;

// Row 1 in week-view: month names spanning week-columns
// Row 2 in week-view: week start day numbers, each column = weekColumnWidth px
```

### Pattern 4: GridBackground Week Mode

In week-view, `GridBackground` receives `viewMode='week'` and:
1. Skips rendering `weekendBlocks` entirely
2. Draws a grid line every 7 days (week boundary) — same visual weight as existing `gantt-gb-weekSeparator`
3. Draws a stronger line at month boundaries — reuses existing `gantt-gb-monthSeparator` class

```typescript
// geometry.ts — new function or extend calculateGridLines
// In week-view, lines appear at i=0, 7, 14, 21... plus month-boundary flags
```

### Pattern 5: TodayIndicator — No Change Required

`TodayIndicator` calculates pixel position as:
```typescript
const offset = getDayOffset(todayLocal, monthStart); // number of days
const position = Math.round(offset * dayWidth);       // pixels
```

This is day-accurate. In week-view, `dayWidth` stays small (7–8px), so the indicator lands at the correct intra-week pixel position. No change needed. The indicator will be ~1/7 of a week-column wide, which is visually appropriate.

### Anti-Patterns to Avoid

- **Don't change the `days` array representation.** The `getMultiMonthDays` output is a flat array of individual days. Do not change it to return week objects — all existing code (TaskRow, drag, dependency lines) depends on it being day-based.
- **Don't round drag results to week start.** The locked decision explicitly prohibits rounding to week boundaries. Keep `pixelsToDate` / `snapToGrid` as-is.
- **Don't fork `useTaskDrag` for week-view.** The hook works in pixel/day space which is unchanged.
- **Don't add `viewMode` to `TaskRow`.** Task bars are positioned in day pixels; `viewMode` is irrelevant there.
- **Don't remove month boundary detection from GridBackground.** Month separators must remain visible in week-view (locked decision).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Month label formatting | Custom formatter | `format(date, 'LLLL yyyy', { locale: ru })` from date-fns | Already used in TimeScaleHeader |
| UTC date arithmetic | Custom UTC math | `parseUTCDate`, `getDayOffset` from dateUtils | Already handles DST edge cases |
| Task bar pixel math | Custom geometry | `calculateTaskBar`, `pixelsToDate` from geometry.ts | Already day-accurate, works in week-view unchanged |
| Week start detection | Manual calc | `getWeekStartDays(days)` — trivial slice at i%7==0 | Simple enough, but should live in dateUtils for testability |

**Key insight:** Week-view is purely a rendering concern. The underlying date model (day-based array) is unchanged. The work is ~80% in TimeScaleHeader and GridBackground.

---

## Common Pitfalls

### Pitfall 1: "Incomplete" Week at Range Boundaries

**What goes wrong:** `getMultiMonthDays` always returns full calendar months. The range starts on the 1st and ends on the last day of a month. These boundaries may not fall on a Monday, so the first and last "weeks" in the range will have fewer than 7 days.

**Why it happens:** Weeks are defined as 7-day blocks starting from `days[0]`, not from the nearest Monday. The last block has `days.length % 7` days.

**How to avoid (discretion area):** Render the partial first/last week column at reduced width (`(days.length % 7 || 7) * dayWidth`). In `getWeekStartDays` and `getWeekSpans`, include partial weeks — do not skip them.

**Warning signs:** Header row 2 has fewer week labels than expected; right edge of chart is misaligned.

### Pitfall 2: Month Span Calculation in Week-View

**What goes wrong:** In day-view, `getMonthSpans` returns `{ days: N }` where N is calendar days. In week-view, the top row spans must be expressed in week-column units, not day units, otherwise month labels will have wrong widths.

**Why it happens:** `span.days * dayWidth` gives correct day-view width. In week-view the equivalent is `span.weeks * dayWidth * 7`.

**How to avoid:** `getWeekSpans` must return `{ weeks: N }` (week-column count), and TimeScaleHeader week branch must use `span.weeks * weekColumnWidth` for the month cell width.

**Warning signs:** Month labels overflow their column or leave gaps at month boundaries.

### Pitfall 3: gridWidth Calculation

**What goes wrong:** `gridWidth = dateRange.length * dayWidth` is correct for day-view. In week-view it remains correct — the grid still renders all days (each day is `dayWidth` pixels wide under the hood). Only the header and grid lines change their visual grouping.

**Why it happens:** Temptation to change gridWidth to `weeks * dayWidth * 7`.

**How to avoid:** Leave `gridWidth` formula unchanged. The task area width is still `days.length * dayWidth`.

### Pitfall 4: React.memo arePropsEqual in GridBackground

**What goes wrong:** `GridBackground` has a custom `arePropsEqual` that compares `dayWidth`, `dateRange.length`, and `totalHeight`. Adding `viewMode` prop without updating `arePropsEqual` means switching between day/week will not trigger re-render.

**How to avoid:** Add `prevProps.viewMode !== nextProps.viewMode` to the arePropsEqual check (return false = re-render needed when viewMode changes).

### Pitfall 5: TodayIndicator "Week Column" Width Mismatch

**What goes wrong:** In day-view, today's column is highlighted in the header (red cell). In week-view the day row is replaced by week-start numbers. If the today highlight class (`gantt-tsh-today`) is accidentally applied to a week cell, it will paint the entire week column red.

**How to avoid:** In week-view branch of TimeScaleHeader, do not apply `gantt-tsh-today` to week cells. Today is indicated only by `TodayIndicator` (the vertical line).

---

## Code Examples

Verified patterns from existing codebase:

### Existing getMonthSpans (model for getWeekSpans)
```typescript
// Source: packages/gantt-lib/src/utils/dateUtils.ts
export const getMonthSpans = (
  dateRange: Date[]
): Array<{ month: Date; days: number; startIndex: number }> => {
  // Groups consecutive days by month, tracks count per month
  // Returns array of spans — same pattern needed for getWeekSpans
};
```

### Existing TimeScaleHeader row structure
```typescript
// Source: packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx
// Row 1: monthSpans.map() -> div with width = span.days * dayWidth
// Row 2: days.map() -> CSS grid, each cell = dayWidth px
// In week-view:
// Row 1: weekSpans.map() -> div with width = span.weeks * dayWidth * 7
// Row 2: weekStartDays.map() -> CSS grid, each cell = dayWidth * 7 px
```

### Existing GridBackground line rendering
```typescript
// Source: packages/gantt-lib/src/components/GridBackground/GridBackground.tsx
// Lines use CSS classes:
//   .gantt-gb-monthSeparator  (2px, dark — month boundary)
//   .gantt-gb-weekSeparator   (1px, medium — week boundary)
//   .gantt-gb-dayLine         (1px, light — individual day)
//
// In week-view: render only monthSeparator + weekSeparator (at every 7-day step)
// Skip dayLine and weekendBlock entirely
```

### Existing TodayIndicator (works unchanged)
```typescript
// Source: packages/gantt-lib/src/components/TodayIndicator/TodayIndicator.tsx
const offset = getDayOffset(todayLocal, monthStart); // days from range start
const position = Math.round(offset * dayWidth);      // pixels — correct in both modes
```

### Existing drag hook — day-based, unchanged
```typescript
// Source: packages/gantt-lib/src/hooks/useTaskDrag.ts
function snapToGrid(pixels: number, dayWidth: number): number {
  return Math.round(pixels / dayWidth) * dayWidth; // snaps to nearest day, not week
}
// dayWidth is passed from GanttChart — in week-view it stays small (7-8px)
// This correctly snaps to day boundaries, which is the locked requirement
```

### Format month label (Russian, existing pattern)
```typescript
// Source: packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx
format(span.month, 'LLLL yyyy', { locale: ru }).replace(/^./, (c) => c.toUpperCase())
// "март 2026" -> "Март 2026"
// Same format for week-view row 1
```

---

## State of the Art

| Old Approach | Current Approach | Impact for Phase 20 |
|--------------|------------------|---------------------|
| Single view mode (day only) | day-view as default, week-view additive | viewMode prop defaults to 'day', zero breaking change |
| N/A | GridBackground already has weekSeparator class | Can reuse `.gantt-gb-weekSeparator` for week-column lines in week-view |
| N/A | calculateGridLines already sets isWeekStart flag | In week-view, suppress day lines, promote week lines to primary |

---

## Open Questions

1. **Week alignment: relative vs. calendar**
   - What we know: Locked decision says "column = 1 week". `getMultiMonthDays` starts ranges on the 1st of a month.
   - What's unclear: Do weeks start on the 1st of the range (relative) or on Mondays (calendar weeks)?
   - Recommendation (discretion area): Use relative weeks (days[0], days[7], days[14]...) — simpler, predictable, avoids day-of-week dependency. First week always starts on day 1 of the visible range.

2. **Partial last week rendering**
   - What we know: `days.length` is rarely a multiple of 7 (full months: 28/30/31 days).
   - What's unclear: Should the last partial week column have a narrower pixel width?
   - Recommendation: Render at full `dayWidth * 7` width by padding the calculation (use `Math.ceil(days.length / 7) * 7` for the week count). The visual grid will extend slightly beyond the actual data area, which is consistent with day-view behavior (padding months already exist).

3. **TodayIndicator width in week-view**
   - What we know: The indicator is a 1–2px wide line via CSS variable `--gantt-today-indicator-width`.
   - What's unclear: Should it be wider in week-view to be more visible?
   - Recommendation (discretion area): No change. The thin line is appropriate; a wide "week-wide" today block would conflict with the task bar reading.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via `@vitejs/plugin-react`) |
| Config file | `packages/gantt-lib/vitest.config.ts` |
| Quick run command | `cd packages/gantt-lib && npx vitest run src/__tests__/dateUtils.test.ts` |
| Full suite command | `cd packages/gantt-lib && npx vitest run` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| `getWeekStartDays` returns every 7th day | unit | `npx vitest run src/__tests__/dateUtils.test.ts` | ❌ Wave 0 |
| `getWeekSpans` groups days by month in week-columns | unit | `npx vitest run src/__tests__/dateUtils.test.ts` | ❌ Wave 0 |
| `getWeekSpans` handles partial first/last week | unit | `npx vitest run src/__tests__/dateUtils.test.ts` | ❌ Wave 0 |
| `getWeekSpans` handles range spanning year boundary | unit | `npx vitest run src/__tests__/dateUtils.test.ts` | ❌ Wave 0 |
| `viewMode='day'` default renders identically to current behavior | visual/manual | n/a | manual-only |
| Week-view header row 2 shows correct start-of-week day numbers | visual/manual | n/a | manual-only |
| Drag in week-view preserves exact day precision | visual/manual | n/a | manual-only |

### Sampling Rate
- **Per task commit:** `cd packages/gantt-lib && npx vitest run src/__tests__/dateUtils.test.ts`
- **Per wave merge:** `cd packages/gantt-lib && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Add `getWeekSpans` test suite to `packages/gantt-lib/src/__tests__/dateUtils.test.ts`
- [ ] Add `getWeekStartDays` test suite to `packages/gantt-lib/src/__tests__/dateUtils.test.ts`

*(All tests go in the existing file — no new test files needed)*

---

## Sources

### Primary (HIGH confidence)
- Direct source read: `packages/gantt-lib/src/utils/dateUtils.ts` — full implementation of getMonthSpans (model for new utils)
- Direct source read: `packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx` — existing 2-row header structure
- Direct source read: `packages/gantt-lib/src/components/GridBackground/GridBackground.tsx` — existing line/weekend rendering
- Direct source read: `packages/gantt-lib/src/components/TodayIndicator/TodayIndicator.tsx` — existing day-offset positioning
- Direct source read: `packages/gantt-lib/src/hooks/useTaskDrag.ts` — snapToGrid uses dayWidth, day-based
- Direct source read: `packages/gantt-lib/src/utils/geometry.ts` — calculateGridLines, calculateWeekendBlocks
- Direct source read: `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` — prop surface and data flow

### Secondary (MEDIUM confidence)
- `packages/gantt-lib/src/__tests__/dateUtils.test.ts` — test patterns for Wave 0 additions
- `packages/gantt-lib/vitest.config.ts` — test runner config

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies identified from existing imports, no new packages needed
- Architecture: HIGH — full source code reviewed, all touch points identified
- Pitfalls: HIGH — derived from direct code analysis (arePropsEqual, gridWidth formula, partial weeks)
- New utils design: HIGH — modelled directly on existing getMonthSpans pattern

**Research date:** 2026-03-16
**Valid until:** Stable — internal codebase, no external dependency changes
