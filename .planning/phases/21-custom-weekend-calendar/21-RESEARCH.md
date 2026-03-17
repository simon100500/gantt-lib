# Phase 21: Custom Weekend Calendar - Research

**Researched:** 2026-03-18
**Domain:** React date manipulation, custom weekend logic, UI styling
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **API пропсов**: Добавить два пропса в `GanttChart`:
  - `weekends?: Date[]` — массив дат для добавления к выходным (праздники)
  - `workdays?: Date[]` — массив дат для исключения из выходных (делать рабочими)
- **Приоритет**: При передаче обоих пропсов: `workdays` имеет приоритет над `weekends` (если дата есть в обоих — она рабочий день)
- **Поведение по умолчанию**: Если ни один пропс не передан — поведение по умолчанию (суббота + воскресенье)
- **Сравнение дат**: Сравнение по UTC: `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`
- **Рендер подсветки в GridBackground**: Кастомные выходные подсвечиваются **только в day-view**
- **TimeScaleHeader**: Числа выходных дней в заголовке красим красным/розовым цветом
- **DatePicker**: Визуально отметить выходные дни цветом, выбор дат разрешён (не блокировать)

### Claude's Discretion
- Точные hex-коды для цветов в TimeScaleHeader и DatePicker
- Детали реализации визуальной отметки в DatePicker (CSS класс vs inline styles)
- Обработка edge cases (пустые массивы, невалидные даты)

### Deferred Ideas (OUT OF SCOPE)
Нет отложенных идей — обсуждение осталось в рамках фазы.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAL-01 | User can pass `weekends?: Date[]` prop to GanttChart for custom weekend dates | TypeScript prop extension, Date array handling, UTC comparison |
| CAL-02 | User can pass `isWeekend?: (date: Date) => boolean` prop to GanttChart for flexible weekend logic | Predicate function pattern, precedence logic |
| CAL-03 | Component highlights custom weekend dates with red background in GridBackground | Existing `calculateWeekendBlocks` adaptation, weekend block rendering |
| CAL-04 | Both props work together — isWeekend takes precedence if both provided | Precedence logic: workdays > weekends > default |
| CAL-05 | Default behavior (Saturday/Sunday) remains if no props passed | Fallback to existing `isWeekend` utility, backward compatibility |
</phase_requirements>

## Summary

Phase 21 требует расширения текущей системы подсветки выходных дней (суббота/воскресенье) до поддержки пользовательских календарей. Пользователи смогут передавать массивы кастомных выходных (`weekends?: Date[]`) и рабочих дней (`workdays?: Date[]`) для реализации праздников и переносов выходных. Также требуется поддержка гибкой логики через предикат `isWeekend?: (date: Date) => boolean` для сложных сценариев (сменные графики, нестандартные рабочие недели).

Ключевой технический вызов — адаптация существующей функции `calculateWeekendBlocks` в `geometry.ts` которая сейчас жестко кодирует проверку `dayOfWeek === 0 || dayOfWeek === 6`. Новая логика должна принимать опциональные массивы дат и предикат, корректно обрабатывать приоритеты (workdays > weekends > default), и сохранять производительность через `React.memo` оптимизацию. Все сравнения дат должны использовать UTC-методы для избежания проблем с часовыми поясами (уже установленный паттерн в проекте).

**Primary recommendation:** Использовать Set-based lookup для O(1) проверки принадлежности даты к `weekends`/`workdays` массивам, создать адаптер `createIsWeekendPredicate` для унификации логики, и расширить `GridBackgroundProps`/`TimeScaleHeaderProps` новыми пропами.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | 4.1.0 | Date manipulation, UTC utilities | Already in project, provides `isSameDay`, UTC-safe methods |
| React | 18+ | UI rendering | Project requirement, `React.memo` for optimization |
| TypeScript | 5.x | Type safety | Project requirement, prop interfaces |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing utils | - | `parseUTCDate`, `getUTC*` methods | All date operations must use UTC pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Set lookup | Array.includes() | Set: O(1) vs O(n), critical for large date arrays |
| UTC comparison | Local time comparison | UTC prevents DST bugs (project standard) |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
npm list date-fns  # verify: 4.1.0
```

**Version verification:**
- `date-fns@4.1.0` — current, verified via `npm list`
- TypeScript `5.x` — project standard
- React `18+` — project requirement

## Architecture Patterns

### Recommended Project Structure
```
src/
├── utils/
│   ├── dateUtils.ts          # Existing: add createIsWeekendPredicate
│   └── geometry.ts           # Modify: calculateWeekendBlocks signature
├── components/
│   ├── GanttChart/
│   │   └── GanttChart.tsx    # Add: weekends?, workdays? props
│   ├── GridBackground/
│   │   ├── GridBackground.tsx # Add: customWeekends?, isCustomWeekend? props
│   │   └── GridBackground.css # Existing: .gantt-gb-weekendBlock
│   ├── TimeScaleHeader/
│   │   ├── TimeScaleHeader.tsx # Add: customWeekends?, isCustomWeekend? props
│   │   └── TimeScaleHeader.css # Existing: .gantt-tsh-weekendDay styles
│   └── ui/
│       ├── Calendar.tsx       # Modify: accept customWeekends, isCustomWeekend
│       └── DatePicker.tsx     # Add: weekends?, workdays?, isWeekend? props
```

### Pattern 1: UTC-Safe Date Comparison
**What:** Все сравнения дат используют `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()` для избежания проблем с DST и часовыми поясами.

**When to use:** Во всех операциях сравнения дат, особенно для проверки принадлежности к массиву `weekends`/`workdays`.

**Example:**
```typescript
// Source: Existing pattern in dateUtils.ts
export const isSameDayUTC = (date1: Date, date2: Date): boolean => {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
};

// Create Set key for O(1) lookup
export const createDateKey = (date: Date): string => {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
};
```

### Pattern 2: Predicate Factory for Weekend Logic
**What:** Создать утилиту `createIsWeekendPredicate` которая возвращает функцию `(date: Date) => boolean` на основе переданных пропсов, унифицируя логику для GridBackground, TimeScaleHeader и Calendar.

**When to use:** Когда нужно определить, является ли дата выходным, с учетом всех пропсов и приоритетов.

**Example:**
```typescript
// Source: New utility in dateUtils.ts
export interface WeekendConfig {
  weekends?: Date[];
  workdays?: Date[];
  isWeekend?: (date: Date) => boolean;
}

export const createIsWeekendPredicate = (config: WeekendConfig): ((date: Date) => boolean) => {
  const { weekends, workdays, isWeekend: customPredicate } = config;

  // If custom predicate provided, use it directly (highest priority)
  if (customPredicate) {
    return customPredicate;
  }

  // If workdays provided, exclude these from default weekends
  if (workdays && workdays.length > 0) {
    const workdaySet = new Set(workdays.map(createDateKey));
    return (date: Date) => {
      const key = createDateKey(date);
      if (workdaySet.has(key)) return false; // Workday takes precedence
      const dayOfWeek = date.getUTCDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // Default Sat/Sun
    };
  }

  // If weekends provided, add these to default weekends
  if (weekends && weekends.length > 0) {
    const weekendSet = new Set(weekends.map(createDateKey));
    return (date: Date) => {
      const key = createDateKey(date);
      if (weekendSet.has(key)) return true; // Custom weekend
      const dayOfWeek = date.getUTCDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // Default Sat/Sun
    };
  }

  // Default: Saturday/Sunday only
  return (date: Date) => {
    const dayOfWeek = date.getUTCDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };
};
```

### Pattern 3: Props Flow with Optional Custom Weekends
**What:** Пропсы `weekends?`, `workdays?`, `isWeekend?` передаются из `GanttChart` в `GridBackground`, `TimeScaleHeader`, и опционально в `DatePicker`.

**When to use:** При добавлении новых пропсов в компоненты для поддержки кастомных выходных.

**Example:**
```typescript
// Source: Existing pattern in GanttChart.tsx
export interface GanttChartProps {
  // ... existing props
  /** Custom weekend dates (e.g., holidays) */
  weekends?: Date[];
  /** Custom workday dates (e.g., shifted weekends) */
  workdays?: Date[];
  /** Flexible weekend logic (overrides arrays) */
  isWeekend?: (date: Date) => boolean;
}

// In GanttChart component:
const isCustomWeekend = useMemo(
  () => createIsWeekendPredicate({ weekends, workdays, isWeekend }),
  [weekends, workdays, isWeekend]
);

// Pass to children:
<GridBackground
  dateRange={dateRange}
  dayWidth={dayWidth}
  totalHeight={totalHeight}
  viewMode={viewMode}
  isCustomWeekend={isCustomWeekend} // New prop
/>
```

### Anti-Patterns to Avoid
- **Local time comparison:** Использовать `getDate()`, `getMonth()`, `getFullYear()` — нарушает UTC-паттерн проекта, вызывает DST баги.
- **Array.includes() для больших массивов:** O(n) на каждой дате — использовать Set для O(1) lookup.
- **Мутация пропсов:** Не модифицировать `weekends`/`workdays` массивы — создавать Set в useMemo.
- **Игнорирование viewMode:** Не подсвечивать кастомные выходные в week/month-view — CONTEXT.md явно запрещает это.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date parsing/validation | Custom date parser | `date-fns` (`parse`, `isValid`, `isSameDay`) | Edge cases (leap years, DST), already in project |
| Set-based date lookup | Array.includes() loop | `new Set<DateKey>` | O(1) vs O(n), critical for performance with large date arrays |
| Date key generation | String concatenation | Helper `createDateKey()` | Consistent format, UTC-safe, reusable |
| Weekend logic duplication | Copy-paste checks | `createIsWeekendPredicate()` | Single source of truth, easier to test, consistent behavior |

**Key insight:** Кастомные выходные — это расширение существующей логики, не новая система. Переиспользуйте UTC-паттерн, Set lookup, и фабрику предикатов для избежания дублирования и багов.

## Common Pitfalls

### Pitfall 1: DST и часовые пояса
**What goes wrong:** Использование локальных методов (`getDate()`, `getMonth()`) вызывает сдвиг дат при переходе на летнее/зимнее время, подсветка смещается на день.

**Why it happens:** JavaScript Date объекты internally хранят UTC timestamp, но `get*()` методы возвращают локальное время.

**How to avoid:** Всегда используйте `getUTC*()` методы для сравнения дат. Проект уже установил этот паттерн в `dateUtils.ts` — следуйте ему.

**Warning signs:** Подсветка выходных "прыгает" на день при изменении часового пояса системы или браузера.

### Pitfall 2: Производительность с большими массивами дат
**What goes wrong:** При передаче массива `weekends` на 1000+ дней и проверке через `Array.includes()` каждый рендер тормозит, drag-drop лагает.

**Why it happens:** `Array.includes()` — O(n) операция, вызывается для каждой даты в `dateRange` (potentially hundreds of calls per render).

**How to avoid:** Преобразуйте массивы в Set в `useMemo`, создайте ключ даты для O(1) lookup. Вычисляйте Set только при изменении пропсов.

**Warning signs:** FPS падает ниже 30 при drag操作, Chrome DevTools показывает много времени в `calculateWeekendBlocks`.

### Pitfall 3: Некорректный приоритет workdays над weekends
**What goes wrong:** Дата присутствует и в `weekends`, и в `workdays`, но подсвечивается как выходной вместо рабочего дня.

**Why it happens:** Логика проверки проверяет `weekends` первым, или не проверяет `workdays` вовсе.

**How to avoid:** В `createIsWeekendPredicate` сначала проверяйте `workdays` Set, затем `weekends` Set, затем default Sat/Sun. DOCUMENT этот порядок явно.

**Warning signs:** Тесты показывают неправильный цвет для дат, присутствующих в обоих массивах.

### Pitfall 4: Подсветка в week/month-view
**What goes wrong:** Кастомные выходные подсвечиваются в week/month-view, хотя CONTEXT.md запрещает это.

**Why it happens:** Копипаста логики из day-view без проверки `viewMode` пропа.

**How to avoid:** В `GridBackground` блок `weekendBlocks` уже проверяет `viewMode === 'week' || viewMode === 'month'` — оставьте этот чек intact. Кастомные выходные используют тот же блок, поэтому автоматически наследуют поведение.

**Warning signs:** Визуальный diff показывает подсветку в week-view, что противоречит CONTEXT.md.

## Code Examples

Verified patterns from official sources:

### Date Key for Set Lookup
```typescript
// Source: Existing UTC pattern in dateUtils.ts
export const createDateKey = (date: Date): string => {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
};

// Usage:
const weekendSet = new Set(weekends.map(createDateKey));
const isWeekend = weekendSet.has(createDateKey(dateToCheck));
```

### Modified calculateWeekendBlocks Signature
```typescript
// Source: Adapted from geometry.ts:162-196
export const calculateWeekendBlocks = (
  dateRange: Date[],
  dayWidth: number,
  isCustomWeekend?: (date: Date) => boolean // New parameter
): Array<{ left: number; width: number }> => {
  const blocks: Array<{ left: number; width: number }> = [];
  let inWeekend = false;
  let weekendStartIndex = -1;

  for (let i = 0; i < dateRange.length; i++) {
    const date = dateRange[i];
    // Use custom predicate if provided, otherwise default
    const isWeekend = isCustomWeekend
      ? isCustomWeekend(date)
      : date.getUTCDay() === 0 || date.getUTCDay() === 6;

    if (isWeekend && !inWeekend) {
      inWeekend = true;
      weekendStartIndex = i;
    } else if (!isWeekend && inWeekend) {
      inWeekend = false;
      const left = Math.round(weekendStartIndex * dayWidth);
      const width = Math.round((i - weekendStartIndex) * dayWidth);
      blocks.push({ left, width });
    }
  }

  // Handle case where range ends on a weekend
  if (inWeekend && weekendStartIndex >= 0) {
    const left = Math.round(weekendStartIndex * dayWidth);
    const width = Math.round((dateRange.length - weekendStartIndex) * dayWidth);
    blocks.push({ left, width });
  }

  return blocks;
};
```

### TimeScaleHeader Custom Weekend Styling
```typescript
// Source: Adapted from TimeScaleHeader.tsx
// In day-view row 2, check if day is custom weekend:
{days.map((day, index) => {
  const isWeekendDay = isCustomWeekend ? isCustomWeekend(day) : day.getUTCDay() === 0 || day.getUTCDay() === 6;

  return (
    <div
      key={`day-${index}`}
      className={`gantt-tsh-dayCell ${isWeekendDay ? 'gantt-tsh-weekendDay' : ''}`}
    >
      <span className="gantt-tsh-dayLabel">
        {day.getUTCDate()}
      </span>
    </div>
  );
})}
```

### Calendar Component Custom Weekend Support
```typescript
// Source: Adapted from Calendar.tsx:34-43
export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  initialDate?: Date;
  mode?: 'single' | 'range';
  disabled?: boolean;
  // New props for custom weekends:
  isCustomWeekend?: (date: Date) => boolean;
}

function getDayClassName(
  day: Date,
  selected: Date | undefined,
  isCustomWeekend?: (date: Date) => boolean
): string {
  const classes: string[] = ['gantt-day-btn'];

  if (selected && isSameDay(day, selected)) classes.push('selected');
  if (isToday(day)) classes.push('today');
  // Use custom predicate if provided, otherwise default
  if (isCustomWeekend ? isCustomWeekend(day) : isWeekend(day)) {
    classes.push('weekend');
  }
  if (isBefore(day, startOfDay(new Date())) && !isToday(day)) {
    classes.push('past');
  }

  return classes.join(' ');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded Sat/Sun check | Predicate-based weekend logic | Phase 21 | Flexible calendars, holidays, shift patterns |
| Array.includes() lookup | Set-based O(1) lookup | Phase 21 | Performance with large date arrays |
| Local time date comparison | UTC-safe comparison | Phase 3 | DST timezone bugs fixed |
| Single view mode (day) | Multiple view modes (day/week/month) | Phase 20 | Weekend highlighting varies by viewMode |

**Deprecated/outdated:**
- `date.get*()` методы (без UTC) — deprecated в проекте с Phase 3
- Локальное сравнение дат — вызывает DST баги, заменено на UTC

## Open Questions

1. **DatePicker integration detail**
   - What we know: DatePicker должен визуально отмечать кастомные выходные, передавать пропсы в Calendar
   - What's unclear: Нужен ли отдельный проп `weekends?: Date[]` в DatePicker, или достаточно `isWeekend?: (date: Date) => boolean`?
   - Recommendation: Использовать `isWeekend?: (date: Date) => boolean` в DatePicker для согласованности с Calendar компонентом. Массивы `weekends`/`workdays` остаются в GanttChart, преобразуются в предикат, передаются вниз.

2. **Color scheme for custom weekends**
   - What we know: CONTEXT.md указывает "pink/red (#FCC/#FDD)" для GridBackground, "красный/розовый" для TimeScaleHeader чисел
   - What's unclear: Использовать ли те же CSS переменные что и для стандартных выходных, или ввести новые?
   - Recommendation: Использовать существующие переменные `--gantt-weekend-background` (#fee2e2) и `--gantt-calendar-text-weekend` (#ef4444) — кастомные выходные визуально неотличимы от стандартных, что логично (это просто другие даты, не другой тип).

3. **Empty arrays handling**
   - What we know: `weekends: []` или `workdays: []` — валидные значения
   - What's unclear: Трактовать ли пустой массив как "no custom weekends" (fallback to default) или как "override with empty set" (no weekends at all)?
   - Recommendation: Пустой массив = "no custom dates", fallback to default Sat/Sun. Для полного отключения подсветки выходных пользователь может передать `isWeekend: () => false`.

## Validation Architecture

> Nyquist validation enabled (workflow.nyquist_validation not explicitly false in config.json)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + jsdom |
| Config file | `packages/gantt-lib/vitest.config.ts` |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAL-01 | `weekends?: Date[]` prop accepted and used | unit | `npm test -- --run src/utils/__tests__/dateUtils.test.ts` | ❌ Wave 0 |
| CAL-02 | `isWeekend?: (date: Date) => boolean` prop works | unit | `npm test -- --run src/utils/__tests__/dateUtils.test.ts` | ❌ Wave 0 |
| CAL-03 | Custom weekends highlighted in GridBackground | visual+unit | `npm test -- --run src/components/__tests__/GridBackground.test.tsx` | ❌ Wave 0 |
| CAL-04 | Precedence: workdays > weekends > default | unit | `npm test -- --run src/utils/__tests__/geometry.test.ts` | ❌ Wave 0 |
| CAL-05 | Default Sat/Sun behavior without props | regression | `npm test -- --run src/components/__tests__/GanttChart.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run` (quick unit tests)
- **Per wave merge:** `npm test -- --run --coverage` (full suite + coverage)
- **Phase gate:** Full suite green + coverage >80% for modified files before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/utils/__tests__/dateUtils.test.ts` — tests for `createDateKey`, `createIsWeekendPredicate`
- [ ] `src/utils/__tests__/geometry.test.ts` — tests for modified `calculateWeekendBlocks` with custom weekends
- [ ] `src/components/__tests__/GridBackground.test.tsx` — visual regression tests for weekend highlighting
- [ ] `src/components/__tests__/TimeScaleHeader.test.tsx` — tests for custom weekend day cell styling
- [ ] `src/components/__tests__/Calendar.test.tsx` — tests for custom weekend prop in Calendar
- [ ] Framework install: Already installed (vitest, @vitejs/plugin-react, jsdom)

## Sources

### Primary (HIGH confidence)
- `packages/gantt-lib/src/utils/geometry.ts:162-196` — existing `calculateWeekendBlocks` implementation
- `packages/gantt-lib/src/utils/dateUtils.ts` — UTC-safe date utilities (`parseUTCDate`, `isWeekend`)
- `packages/gantt-lib/src/components/GridBackground/GridBackground.tsx` — weekend block rendering logic
- `packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx` — day cell rendering with weekend styling
- `packages/gantt-lib/src/components/ui/Calendar.tsx` — existing weekend detection via `date-fns isWeekend`
- `packages/gantt-lib/src/components/ui/ui.css:278-288` — existing weekend color styles
- `.planning/phases/03-calendar/03-CONTEXT.md` — original weekend highlighting (#FCC/#FDD)
- `.planning/phases/20-month-view/20-CONTEXT.md` — no weekend highlighting in week/month-view
- `npm list date-fns` — verified version 4.1.0
- `packages/gantt-lib/vitest.config.ts` — test framework configuration

### Secondary (MEDIUM confidence)
- `date-fns` documentation (version 4.1.0) — `isSameDay`, `isWeekend`, `parse`, `isValid` APIs
- React `React.memo` documentation — optimization pattern for props comparison

### Tertiary (LOW confidence)
- None — all findings verified against project source code or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all packages already in project, versions verified
- Architecture: HIGH - based on existing project patterns (UTC, React.memo, props flow)
- Pitfalls: HIGH - identified from existing code and CONTEXT.md constraints
- Validation: MEDIUM - test infrastructure exists, but Wave 0 files need creation

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (30 days — stable domain, date manipulation patterns well-established)

---

*Phase: 21-custom-weekend-calendar*
*Research completed: 2026-03-18*
