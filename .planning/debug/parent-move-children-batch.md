---
status: resolved
trigger: "При сдвижке родительской задачи вызываются ОБА колбэка (onTasksChange и onCascade) с дубликатом родителя"
created: "2026-03-14T00:00:00.000Z"
updated: "2026-03-14T00:00:05.000Z"
---

## Issue
**Title:** Parent task drag triggers both onTasksChange and onCascade callbacks with duplicate parent entry causing race condition

## Symptoms
expected: При сдвижке родителя должен вызываться ОДИН колбэк с корректными данными (parent + дети, без дублей)
actual:
1. Вызываются ОБА колбэка: onTasksChange и onCascade
2. onTasksChange приходит с дубликатом родителя (один с новыми датами, один со старыми)
errors: Race condition - два save с разными данными для одной задачи
reproduction: Drag parent task with children
started: gantt-lib 0.9.0

## Eliminated
- hypothesis: cascadeByLinks doesn't find children
  evidence: Unit tests prove cascadeByLinks DOES correctly return children with updated dates
  timestamp: 2026-03-14T00:00:01.000Z

## Evidence
- timestamp: 2026-03-14T00:00:01.000Z
  checked: cascadeByLinks function
  found: Function correctly finds and processes children, returning them with updated dates
  implication: The issue is not in cascadeByLinks itself

- timestamp: 2026-03-14T00:00:02.000Z
  checked: handleTaskChange flow
  found: Parent appears TWICE in final batch - once with NEW dates (from cascadedTasks), once with OLD dates (from additionalParentUpdates)
  implication: Line adds duplicate parent entry with old dates when parentId === updatedTask.id

- timestamp: 2026-03-14T00:00:04.000Z
  checked: Callback invocation in handleTaskChange and handleCascade
  found: BOTH callbacks called: onTasksChange([...cascadedTasks, ...additionalParentUpdates]) and onCascade(cascadedTasks)
  implication: Race condition - two parallel saves with potentially conflicting data

## Resolution
root_cause: |
  1. Duplicate parent entry: additionalParentUpdates contained parent with OLD dates when parentId === updatedTask.id
  2. Dual callback invocation: Both onTasksChange and onCascade called sequentially with overlapping data

fix: |
  1. handleTaskChange (lines 417-440): When parentId === updatedTask.id, update parent's progress in cascadedTasks directly instead of adding duplicate to additionalParentUpdates
  2. handleCascade (lines 609-630): Applied same fix for consistency
  3. Removed duplicate onCascade calls from both functions (lines 447, 639)
  4. Removed onCascade from useCallback dependencies (lines 449, 640)

verification: |
  - Created unit tests (parentMoveChildren.test.ts) - 2 tests pass
  - Created integration tests (parentMoveChildrenIntegration.test.ts) - 2 tests pass
  - No regressions in existing tests (215 passed, 4 pre-existing failures in dateUtils.test.ts unrelated to this fix)

files_changed:
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  - packages/gantt-lib/src/__tests__/parentMoveChildren.test.ts (new)
  - packages/gantt-lib/src/__tests__/parentMoveChildrenIntegration.test.ts (new)
