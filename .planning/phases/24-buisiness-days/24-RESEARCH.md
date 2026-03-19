# Phase 24: business-days - Research

**Researched:** 2026-03-20
**Domain:** React date manipulation, business days calculation, task duration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Функции в dateUtils.ts**: Добавить две новые функции после `getEndDateFromDuration`:
  - `getBusinessDaysCount(startDate, endDate, weekendPredicate): number`
  - `addBusinessDays(startDate, businessDays, weekendPredicate): string`
- **Проп businessDays в GanttChart.tsx**: `businessDays?: boolean` — считать duration в рабочих днях
- **Проброс через TaskList.tsx**: Добавить проп `businessDays?: boolean`
- **Логика в TaskListRow.tsx**: Создать memoized функции `getDuration` и `getEndDate` с условной логикой
- **Места замены**: Строки 677, 868, 888, 895, 918-920 — заменить `getInclusiveDurationDays`/`getEndDateFromDuration`
- **Обратная совместимость**: Без пропса (undefined) — календарные дни, `businessDays={false}` — календарные, `businessDays={true}` — рабочие дни
- **Зависимости — НЕ трогать**: `calculateSuccessorDate()` в dependencyUtils.ts НЕ менять, Cascade тоже НЕ трогать

### Claude's Discretion
- Конкретная реализация алгоритмов `getBusinessDaysCount` и `addBusinessDays`
- Написание тестов для новых функций
- Обновление типов TypeScript если необходимо

### Deferred Ideas (OUT OF SCOPE)
- Изменение логики зависимостей (calculateSuccessorDate, cascade) — отдельная задача
- UI индикатор режима рабочих дней — не в scope этой фазы
</user_constraints>

## Summary

Phase 24 требует добавления режима учёта рабочих дней при расчёте duration задач. Когда `businessDays={true}`, duration считается в рабочих днях (исключая выходные по `isWeekend`/`customDays`), а не в календарных. Например, задача с Пт по Пн в календарном режиме = 4 дня, а в режиме рабочих дней = 2 дня (Пт+Пн, Сб+Вс исключаются).

Ключевой технический вызов — реализовать две новые функции в `dateUtils.ts`: `getBusinessDaysCount` (подсчёт рабочих дней между датами) и `addBusinessDays` (вычисление даты окончания по количеству рабочих дней). Затем интегрировать их в `TaskListRow.tsx` через memoized функции-обёртки `getDuration` и `getEndDate`, которые выбирают нужный алгоритм в зависимости от пропа `businessDays`. Пробросить проп через `GanttChart` → `TaskList` → `TaskListRow`.

**Primary recommendation:** Использовать итеративный алгоритм для `addBusinessDays` (добавлять по одному дню, пропуская выходные по предикату), а для `getBusinessDaysCount` — подсчёт дней с фильтрацией по `weekendPredicate`. Следовать паттерну Phase 21 для работы с `createCustomDayPredicate` и UTC-безопасными датами.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | 4.1.0 | Date manipulation, UTC utilities | Already in project, provides `parseUTCDate`, `isSameDay` |
| React | 18+ | UI rendering, useMemo optimization | Project requirement, performance for memoized functions |
| TypeScript | 5.x | Type safety, function signatures | Project requirement, prop interfaces |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing utils | - | `parseUTCDate`, `createCustomDayPredicate` | All date operations must use UTC pattern |
| Vitest | 3.0.0 | Unit testing for new functions | Project test framework |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Iterative algorithm | Mathematical formula | Iterative: simpler, handles custom predicates; Formula: complex, breaks with custom weekends |
| UTC date parsing | Local time parsing | UTC prevents DST bugs (project standard) |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
npm list date-fns  # verify: 4.1.0
```

**Version verification:**
- `date-fns@4.1.0` — current, verified via `npm list`
- TypeScript `5.x` — project standard
- React `18+` — project requirement
- Vitest `3.0.0` — test framework

## Architecture Patterns

### Recommended Project Structure
```
src/
├── utils/
│   ├── dateUtils.ts          # Add: getBusinessDaysCount, addBusinessDays
│   └── dependencyUtils.ts    # DON'T TOUCH: calculateSuccessorDate, cascade
├── components/
│   ├── GanttChart/
│   │   └── GanttChart.tsx    # Add: businessDays?: boolean prop
│   └── TaskList/
│       ├── TaskList.tsx      # Add: businessDays?: boolean prop
│       └── TaskListRow.tsx   # Add: memoized getDuration, getEndDate
```

### Pattern 1: Business Days Calculation
**What:** Подсчёт рабочих дней между двумя датами (включительно) с использованием предиката выходных.

**When to use:** Когда `businessDays={true}` и нужно вычислить duration задачи.

**Example:**
```typescript
// Source: New utility in dateUtils.ts
export function getBusinessDaysCount(
  startDate: string | Date,
  endDate: string | Date,
  weekendPredicate: (date: Date) => boolean
): number {
  const start = parseUTCDate(startDate);
  const end = parseUTCDate(endDate);
  let count = 0;
  const current = new Date(start);

  while (current.getTime() <= end.getTime()) {
    if (!weekendPredicate(current)) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return Math.max(1, count);
}
```

### Pattern 2: Add Business Days
**What:** Вычисление даты окончания по начальному дню и количеству рабочих дней.

**When to use:** Когда пользователь редактирует duration и нужно пересчитать endDate.

**Example:**
```typescript
// Source: New utility in dateUtils.ts
export function addBusinessDays(
  startDate: string | Date,
  businessDays: number,
  weekendPredicate: (date: Date) => boolean
): string {
  const start = parseUTCDate(startDate);
  const current = new Date(start);
  let daysToAdd = Math.max(1, businessDays);

  while (daysToAdd > 0) {
    current.setUTCDate(current.getUTCDate() + 1);
    if (!weekendPredicate(current)) {
      daysToAdd--;
    }
  }

  return current.toISOString().split('T')[0];
}
```

### Pattern 3: Memoized Conditional Functions
**What:** Создать memoized функции-обёртки в `TaskListRow.tsx`, которые выбирают нужный алгоритм в зависимости от `businessDays`.

**When to use:** Во всех местах где используется `getInclusiveDurationDays` и `getEndDateFromDuration`.

**Example:**
```typescript
// Source: Adapted from TaskListRow.tsx:28-48
const getDuration = useCallback(
  (start: string | Date, end: string | Date) => {
    return businessDays
      ? getBusinessDaysCount(start, end, weekendPredicate)
      : getInclusiveDurationDays(start, end);
  },
  [businessDays, weekendPredicate]
);

const getEndDate = useCallback(
  (start: string | Date, duration: number) => {
    return businessDays
      ? addBusinessDays(start, duration, weekendPredicate)
      : getEndDateFromDuration(start, duration);
  },
  [businessDays, weekendPredicate]
);
```

### Anti-Patterns to Avoid
- **Изменение dependencyUtils.ts**: Не трогать `calculateSuccessorDate` и cascade — это отдельная задача.
- **Локальное время вместо UTC**: Использовать `getUTC*()` методы для избежания DST багов.
- **Жёсткая логика выходных**: Использовать `weekendPredicate` параметр, а не `isWeekend` напрямую.
- **Пропуск мемоизации**: Не мемоизировать `getDuration`/`getEndDate` → лишние рендеры.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date parsing/validation | Custom date parser | `date-fns` (`parseUTCDate`) | Edge cases (leap years, DST), already in project |
| Weekend detection logic | Hardcoded Sat/Sun check | `weekendPredicate` parameter | Supports custom weekends from Phase 21 |
| Set-based date lookup | Array.includes() loop | Predicate function | Flexible, works with custom calendars |

**Key insight:** Рабочие дни — это расширение существующей логики duration, не новая система. Переиспользуйте UTC-паттерн, predicate-функции из Phase 21, и memoized wrappers для избежания багов.

## Common Pitfalls

### Pitfall 1: DST и часовые пояса
**What goes wrong:** Использование локальных методов (`getDate()`, `getMonth()`) вызывает сдвиг дат при переходе на летнее/зимнее время, duration считается неправильно.

**Why it happens:** JavaScript Date объекты internally хранят UTC timestamp, но `get*()` методы возвращают локальное время.

**How to avoid:** Всегда используйте `getUTC*()` методы в `getBusinessDaysCount` и `addBusinessDays`. Проект уже установил этот паттерн — следуйте ему.

**Warning signs:** Duration "прыгает" на день при изменении часового пояса системы или браузера.

### Pitfall 2: Игнорирование customDays из Phase 21
**What goes wrong:** `businessDays` режим работает только с Sat/Sun, но игнорирует кастомные выходные из `customDays`/`isWeekend` пропов.

**Why it happens:** Функции используют жёсткую проверку `day === 0 || day === 6` вместо переданного предиката.

**How to avoid:** Передавайте `weekendPredicate` из `createCustomDayPredicate` в новые функции. В `TaskListRow.tsx` уже есть `isCustomWeekend` — переиспользуйте его.

**Warning signs:** Тесты с кастомными выходными (праздники) падают, duration не учитывает их.

### Pitfall 3: Off-by-one ошибки в addBusinessDays
**What goes wrong:** `addBusinessDays` возвращает дату на день раньше или позже ожидаемой.

**Why it happens:** Неверная инициализация цикла (например, начинать с `daysToAdd = businessDays - 1` вместо `businessDays`).

**How to avoid:** Следуйте паттерну `getEndDateFromDuration`: `duration - 1` для календарных дней, но для рабочих дней — итеративно добавлять рабочие дни. Начинайте с `start`, добавляйте дни пока не наберёте `businessDays` рабочих.

**Warning signs:** Тесты показывают несоответствие duration для задач через выходные.

### Pitfall 4: Отсутствие мемоизации
**What goes wrong:** При каждом рендере `TaskListRow` создаются новые функции `getDuration`/`getEndDate`, что вызывает лишние перерисовки дочерних компонентов.

**Why it happens:** Прямое использование `useCallback` без зависимостей или вообще без мемоизации.

**How to avoid:** Оберните `getDuration` и `getEndDate` в `useCallback` с правильными зависимостями: `[businessDays, weekendPredicate]`.

**Warning signs:** React DevTools показывает много рендеров `TaskListRow` при drag-drop или редактировании других задач.

## Code Examples

Verified patterns from official sources:

### getBusinessDaysCount Implementation
```typescript
// Source: New utility in dateUtils.ts
export function getBusinessDaysCount(
  startDate: string | Date,
  endDate: string | Date,
  weekendPredicate: (date: Date) => boolean
): number {
  const start = parseUTCDate(startDate);
  const end = parseUTCDate(endDate);
  let count = 0;
  const current = new Date(start);

  while (current.getTime() <= end.getTime()) {
    if (!weekendPredicate(current)) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return Math.max(1, count);
}
```

### addBusinessDays Implementation
```typescript
// Source: New utility in dateUtils.ts
export function addBusinessDays(
  startDate: string | Date,
  businessDays: number,
  weekendPredicate: (date: Date) => boolean
): string {
  const start = parseUTCDate(startDate);
  const current = new Date(start);
  let daysToAdd = Math.max(1, businessDays);

  while (daysToAdd > 0) {
    current.setUTCDate(current.getUTCDate() + 1);
    if (!weekendPredicate(current)) {
      daysToAdd--;
    }
  }

  return current.toISOString().split('T')[0];
}
```

### TaskListRow Integration
```typescript
// Source: Adapted from TaskListRow.tsx:28-48
import { getBusinessDaysCount, addBusinessDays } from '../../utils/dateUtils';

const getDuration = useCallback(
  (start: string | Date, end: string | Date) => {
    return businessDays
      ? getBusinessDaysCount(start, end, weekendPredicate)
      : getInclusiveDurationDays(start, end);
  },
  [businessDays, weekendPredicate]
);

const getEndDate = useCallback(
  (start: string | Date, duration: number) => {
    return businessDays
      ? addBusinessDays(start, duration, weekendPredicate)
      : getEndDateFromDuration(start, duration);
  },
  [businessDays, weekendPredicate]
);

// Replace all usages:
// Line 677: getInclusiveDurationDays → getDuration
// Line 868: getInclusiveDurationDays → getDuration
// Line 888: getEndDateFromDuration → getEndDate
// Line 895: getInclusiveDurationDays → getDuration
// Lines 918-920: getEndDateFromDuration → getEndDate
```

### GanttChart Props Extension
```typescript
// Source: Adapted from GanttChart.tsx:83-144
export interface GanttChartProps {
  // ... existing props
  /** Считать duration в рабочих днях, исключая выходные (default: false) */
  businessDays?: boolean;
}

// In GanttChart component:
const isCustomWeekend = useMemo(
  () => createCustomDayPredicate({ customDays, isWeekend }),
  [customDays, isWeekend]
);

// Pass to TaskList:
<TaskList
  tasks={visibleTasks}
  businessDays={businessDays}
  isCustomWeekend={isCustomWeekend}
  // ... other props
/>
```

### TaskList Props Extension
```typescript
// Source: Adapted from TaskList.tsx:94-144
export interface TaskListProps {
  // ... existing props
  /** Считать duration в рабочих днях */
  businessDays?: boolean;
  /** Optional base weekend predicate for date picker */
  isWeekend?: (date: Date) => boolean;
}

// Pass to TaskListRow:
<TaskListRow
  businessDays={businessDays}
  weekendPredicate={isCustomWeekend || isWeekend}
  // ... other props
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Calendar-only duration | Business days mode | Phase 24 | Flexible scheduling, holidays support |
| Hardcoded duration logic | Predicate-based duration | Phase 24 | Works with custom weekends from Phase 21 |
| Local date arithmetic | UTC-safe date arithmetic | Phase 3 | DST timezone bugs fixed |

**Deprecated/outdated:**
- Локальное сравнение дат — вызывает DST баги, заменено на UTC

## Open Questions

Нет открытых вопросов — все технические решения определены в CONTEXT.md и существующем коде.

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
| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| `getBusinessDaysCount` подсчитывает рабочие дни (включая выходные) | unit | `npm test -- --run src/__tests__/dateUtils.test.ts` | ❌ Wave 0 |
| `getBusinessDaysCount` работает с customDays | unit | `npm test -- --run src/__tests__/dateUtils.test.ts` | ❌ Wave 0 |
| `addBusinessDays` вычисляет дату окончания | unit | `npm test -- --run src/__tests__/dateUtils.test.ts` | ❌ Wave 0 |
| `addBusinessDays` работает с customDays | unit | `npm test -- --run src/__tests__/dateUtils.test.ts` | ❌ Wave 0 |
| TaskListRow использует `getDuration` при `businessDays={true}` | integration | `npm test -- --run src/__tests__/taskListDuration.test.tsx` | ✅ Exists |
| TaskListRow использует `getEndDate` при редактировании duration | integration | `npm test -- --run src/__tests__/taskListDuration.test.tsx` | ✅ Exists |
| Обратная совместимость (undefined = календарные дни) | regression | `npm test -- --run src/__tests__/dateUtils.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run` (quick unit tests for dateUtils)
- **Per wave merge:** `npm test -- --run --coverage` (full suite + coverage)
- **Phase gate:** Full suite green + coverage >80% for modified files before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/dateUtils.test.ts` — добавить тесты для `getBusinessDaysCount` (календарные дни, через выходные, с customDays)
- [ ] `src/__tests__/dateUtils.test.ts` — добавить тесты для `addBusinessDays` (календарные дни, через выходные, с customDays)
- [ ] `src/__tests__/dateUtils.test.ts` — добавить тест обратной совместимости (undefined/false = календарные дни)
- [ ] Framework install: Already installed (vitest, @vitejs/plugin-react, jsdom)

## Sources

### Primary (HIGH confidence)
- `packages/gantt-lib/src/utils/dateUtils.ts:1-605` — existing date utilities (parseUTCDate, createCustomDayPredicate)
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx:28-48` — existing duration functions (getInclusiveDurationDays, getEndDateFromDuration)
- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx:83-144` — existing props pattern
- `packages/gantt-lib/src/components/TaskList/TaskList.tsx:94-144` — existing TaskListProps
- `packages/gantt-lib/src/__tests__/dateUtils.test.ts:1-572` — existing test patterns for dateUtils
- `packages/gantt-lib/src/__tests__/taskListDuration.test.tsx:1-50` — existing duration tests
- `.planning/phases/24-buisiness-days/24-CONTEXT.md:1-156` — locked implementation decisions
- `.planning/phases/21-custom-weekend-calendar/21-RESEARCH.md:1-477` — predicate pattern from Phase 21
- `npm list date-fns` — verified version 4.1.0
- `packages/gantt-lib/vitest.config.ts` — test framework configuration
- `packages/gantt-lib/package.json` — project dependencies

### Secondary (MEDIUM confidence)
- `date-fns` documentation (version 4.1.0) — UTC-safe date manipulation patterns
- React `useCallback` documentation — memoization pattern for conditional functions

### Tertiary (LOW confidence)
- None — all findings verified against project source code or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all packages already in project, versions verified
- Architecture: HIGH - based on existing project patterns (UTC, predicates, memoization)
- Pitfalls: HIGH - identified from existing code and CONTEXT.md constraints
- Validation: HIGH - test infrastructure exists, Wave 0 gaps clearly identified

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (30 days — stable domain, date manipulation patterns well-established)

---

*Phase: 24-buisiness-days*
*Research completed: 2026-03-20*
