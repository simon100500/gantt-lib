# Phase 24: buisiness-days - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning
**Source:** PRD Express Path (c:\Users\Volobuev\.claude\plans\agile-kindling-lynx.md)

<domain>
## Phase Boundary

Добавить режим учёта только рабочих дней при расчёте duration задач. Когда `businessDays={true}`, duration считается в рабочих днях (исключая выходные по isWeekend/customDays), а не в календарных.

**Пример:**
- Календарный режим: Пт[Сб][Вс]Пн = 4 дня
- Рабочие дни: Пт[Сб][Вс]Пн**Вт**Ср = 4 рабочих дня (Пт+Пн+Вт+Ср)
</domain>

<decisions>
## Implementation Decisions

### Функции в dateUtils.ts (LOCKED)
Добавить две новые функции после `getEndDateFromDuration`:

```typescript
export function getBusinessDaysCount(
  startDate: string | Date,
  endDate: string | Date,
  weekendPredicate: (date: Date) => boolean
): number;

export function addBusinessDays(
  startDate: string | Date,
  businessDays: number,
  weekendPredicate: (date: Date) => boolean
): string;
```

### Проп businessDays в GanttChart.tsx (LOCKED)
```typescript
export interface GanttChartProps {
  // ... существующие пропсы
  /** Считать duration в рабочих днях, исключая выходные (default: false) */
  businessDays?: boolean;
}
```

### Проброс через TaskList.tsx (LOCKED)
```typescript
export interface TaskListProps {
  // ... существующие пропсы
  /** Считать duration в рабочих днях */
  businessDays?: boolean;
}
```

### Логика в TaskListRow.tsx (LOCKED)
1. Добавить импорт `getBusinessDaysCount, addBusinessDays`
2. Добавить проп `businessDays?: boolean` в TaskListRowProps
3. Создать memoized функции `getDuration` и `getEndDate`:
   ```typescript
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
4. Заменить все использования:
   - Строка 677: `getInclusiveDurationDays` → `getDuration`
   - Строка 868: `getInclusiveDurationDays` → `getDuration`
   - Строка 888: `getEndDateFromDuration` → `getEndDate`
   - Строка 895: `getInclusiveDurationDays` → `getDuration`
   - Строки 918-920: `getEndDateFromDuration` → `getEndDate`

### Обратная совместимость (LOCKED)
- Без пропса (undefined) — работает как раньше (календарные дни)
- `businessDays={false}` — календарные дни
- `businessDays={true}` — рабочие дни

### Зависимости — НЕ трогать (LOCKED)
`calculateSuccessorDate()` в dependencyUtils.ts НЕ менять — lag остаётся в календарных днях.
Cascade (universalCascade) тоже НЕ трогать — это отдельная задача.

### Claude's Discretion
- Конкретная реализация алгоритмов `getBusinessDaysCount` и `addBusinessDays`
- Написание тестов для новых функций
- Обновление типов TypeScript если необходимо
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Существующий код для интеграции
- `packages/gantt-lib/src/utils/dateUtils.ts` — текущие функции `getInclusiveDurationDays`, `getEndDateFromDuration`, `createCustomDayPredicate`
- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` — добавить проп `businessDays`
- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` — проброс пропа
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — основная логика замены функций

### Связанные фазы
- Phase 21: Custom Weekend Calendar — уже реализован `customDays` и `isWeekend` predicate
- Phase 21.1: custom-weekend-refactoring — unified API для кастомного календаря

### Тестовые паттерны
- `.planning/phases/21-custom-weekend-calendar/21-RESEARCH.md` — пример TDD подхода для утилит дат
</canonical_refs>

<specifics>
## Specific Ideas

### Функция getBusinessDaysCount
- Подсчитать количество рабочих дней между двумя датами (включительно)
- Минимум 1 день
- Использует weekendPredicate для определения выходных

### Функция addBusinessDays
- Вычисляет дату окончания по начальному дню и количеству рабочих дней
- businessDays минимум 1
- Возвращает YYYY-MM-DD

### Сценарии проверки
1. Задача Пт-Пн показывает duration=2 (Пт+Пн, Сб+Вс выходные)
2. При редактировании duration=4: endDate пересчитывается правильно (Пт+Пн+Вт+Ср)
3. С кастомным календарём — учитывает customDays

### Текущие места использования duration в TaskListRow.tsx
- Строка 677 — initial state
- Строки 867, 868 — handleDurationClick
- Строки 888, 920 — handleDurationSave
- Строка 895 — handleDurationCancel
- Строки 918, 920 — handleDurationKeyDown
</specifics>

<deferred>
## Deferred Ideas

- Изменение логики зависимостей (calculateSuccessorDate, cascade) — отдельная задача
- UI индикатор режима рабочих дней — не в scope этой фазы
</deferred>

---

*Phase: 24-buisiness-days*
*Context gathered: 2026-03-20 via PRD Express Path*
