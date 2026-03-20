---
phase: 24-buisiness-days
plan: ht7-business-days-calc
subsystem: dependency-cascade
tags: [business-days, cascade, dependencies]
wave: 3
dependency_graph:
  requires: ["24-01", "24-02"]
  provides: ["business-days-cascade"]
  affects: ["drag-drop", "task-scheduling"]
tech_stack:
  added: []
  patterns:
    - Business days propagation through cascade chain
    - Optional parameters with backward compatibility
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/utils/dependencyUtils.ts
    - packages/gantt-lib/src/hooks/useTaskDrag.ts
    - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
decisions: []
metrics:
  duration: "10 minutes"
  completed_date: "2026-03-20"
---

# Phase 24 Plan ht7: Business Days Cascade Summary

Добавлена поддержка рабочих дней в каскадный пересчёт зависимостей: при сдвижке задачи зависимые задачи теперь учитывают выходные когда `businessDays={true}`.

## One-liner

Каскадный пересчёт зависимостей с пропуском выходных при `businessDays=true` — lag пересчитывается в рабочих днях, successor даты сдвигаются с учётом weekend predicate.

## Changes Made

### Task 1: Обновление calculateSuccessorDate и computeLagFromDates

**File:** `packages/gantt-lib/src/utils/dependencyUtils.ts`

Добавлены опциональные параметры `businessDays` и `weekendPredicate` в обе функции:

1. **computeLagFromDates** — теперь считает lag в рабочих днях когда `businessDays=true`:
   - Использует `getBusinessDaysCount` для подсчёта рабочих дней между датами
   - Обратная совместимость: при `false`/`undefined` работает как раньше (календарные дни)

2. **calculateSuccessorDate** — теперь сдвигает даты с пропуском выходных:
   - Использует `addBusinessDays` для расчёта новой даты successor
   - Разная логика для FS/SS/FF/SF link types
   - Обратная совместимость сохранена

### Task 2: Обновление universalCascade

**File:** `packages/gantt-lib/src/utils/dependencyUtils.ts`

- Добавлены параметры `businessDays` и `weekendPredicate` в сигнатуру функции
- Обновлены вызовы `computeLagFromDates` и `calculateSuccessorDate` в RULE 3 (dependency cascade)
- RULE 1 (hierarchy children) и RULE 2 (parent recalc) не изменены — delta-based логика корректна для обоих режимов

### Task 3: Проброс businessDays через компоненты

**Files:**
- `packages/gantt-lib/src/hooks/useTaskDrag.ts`
- `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx`

**useTaskDrag.ts:**
- Добавлены `businessDays` и `weekendPredicate` в интерфейс `UseTaskDragOptions`
- Извлечение параметров из `options`
- Добавление параметров в `ActiveDragState` (для RAF callbacks)
- Передача параметров в оба вызова `universalCascade` (preview + complete)

**TaskRow.tsx:**
- Перемещён `weekendPredicate` `useMemo` выше `useTaskDrag` (исправлена ошибка TS2454)
- Добавлена передача `businessDays` и `weekendPredicate` в `useTaskDrag`
- Props `businessDays`, `customDays`, `isWeekend` уже были в `TaskRowProps` из Phase 21

## Deviations from Plan

None - plan executed exactly as written.

## Testing

- TypeScript compilation: ✓ PASSED
- Build: ✓ PASSED
- Dependency-related tests: ✓ PASSED (280 tests passed)

Note: Pre-existing failing tests in dateUtils.test.ts (getWeekSpans) are unrelated to this change.

## Commits

1. `42ce552` - feat(24-ht7): add businessDays support to calculateSuccessorDate and computeLagFromDates
2. `5dc31cf` - feat(24-ht7): update universalCascade to support businessDays
3. `add9bb0` - feat(24-ht7): pass businessDays through GanttChart → useTaskDrag → universalCascade

## Verification

✓ calculateSuccessorDate и computeLagFromDates поддерживают бизнес-режим
✓ universalCascade пробрасывает businessDays в зависимости
✓ При drag-and-drop зависимые задачи учитывают выходные когда businessDays=true
✓ Обратная совместимость: при businessDays=false/undefined работает как раньше
✓ TypeScript компилируется без ошибок
✓ npm run build успешен

## Self-Check: PASSED

- SUMMARY.md created: ✓
- All commits verified: ✓ (42ce552, 5dc31cf, add9bb0)
- Files modified: ✓ (dependencyUtils.ts, useTaskDrag.ts, TaskRow.tsx)
- Build successful: ✓

