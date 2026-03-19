---
phase: quick
plan: 260319-w9n
title: "Добавить collapsedParentIds и onToggleCollapse пропсы"
one_liner: "Controlled/uncontrolled pattern для collapse/expand состояния родительских задач"
subsystem: "GanttChart API"
tags: ["api", "controlled-component", "hierarchy"]
dependency_graph:
  requires: []
  provides: ["collapsedParentIds prop", "onToggleCollapse callback"]
  affects: ["GanttChartProps", "TaskList integration"]
tech_stack:
  added: []
  patterns: ["controlled/uncontrolled component pattern"]
key_files:
  created: []
  modified: ["packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"]
decisions: []
metrics:
  duration: "2m"
  completed_date: "2026-03-19"
---

## Phase Quick: Plan 260319-w9n Summary

### Задача
Добавить пропсы `collapsedParentIds` и `onToggleCollapse` в `GanttChartProps` для управления состоянием collapse/expand родительских задач извне.

### Реализация

**Изменения в GanttChart.tsx:**

1. **Добавлены новые пропсы в GanttChartProps:**
   - `collapsedParentIds?: Set<string>` — для controlled режима
   - `onToggleCollapse?: (parentId: string) => void` — callback для controlled режима

2. **Улучшен внутренний стейт:**
   - Внутренний стейт переименован в `internalCollapsedParentIds`
   - Добавлена логика выбора: `const collapsedParentIds = externalCollapsedParentIds ?? internalCollapsedParentIds`
   - Если передан `externalCollapsedParentIds`, используется он (controlled режим)
   - Иначе используется внутренний стейт (uncontrolled режим)

3. **Обновлён handleToggleCollapse:**
   - Использует `externalOnToggleCollapse` если передан (controlled режим)
   - Иначе использует внутренний handler с `setInternalCollapsedParentIds` (uncontrolled режим)

4. **Обновлены handleCollapseAll/handleExpandAll:**
   - Проверяют `externalCollapsedParentIds` перед модификацией стейта
   - Если используется controlled режим, не модифицируют стейт (early return)
   - Это предотвращает конфликты между управляемым и неуправляемым режимами

### Проверено

- [x] TypeScript компилируется без ошибок
- [x] Экспортируемые типы включают новые пропсы
- [x] В uncontrolled режиме (без props) компонент работает как раньше
- [x] В controlled режиме (с props) стейт управляется извне

### Deviations from Plan

**Auto-fixed Issues:**

None - plan executed exactly as written.

### Commits

- `0be31d5`: feat(260319-w9n): добавить collapsedParentIds и onToggleCollapse пропсы в GanttChart
