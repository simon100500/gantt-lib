---
status: resolved
trigger: "parent-task-no-progress-fill"
created: 2026-03-11T00:00:00.000Z
updated: 2026-03-11T00:00:05.000Z
---

## Current Focus
hypothesis: FIX VERIFIED BY USER - parent tasks now show progress fill correctly
test: User confirmed in actual application that parent tasks display progress fill proportional to children's completion
expecting: Issue resolved
next_action: Archive session and commit fix

## Symptoms
expected: Текстовый процент в прогрессбаре + заливка (родительская задача должна показывать прогресс подзадач - залитая область пропорционально выполненным подзадачам)
actual: Нет заливки вообще - прогрессбар родителя всегда пустой
errors: Нет ошибок в консоли
reproduction: Создаю родительскую задачу, добавляю подзадачи, отмечаю выполненными
timeline: Никогда не работало - эта функция никогда не работала

## Eliminated

## Evidence
- timestamp: 2026-03-11T00:00:00.000Z
  checked: TaskRow.tsx line 279
  found: `{!isParent && progressWidth > 0 && (` explicitly prevents progress bar rendering for parent tasks
  implication: Parent tasks will never render progress fill bar regardless of their progress value

- timestamp: 2026-03-11T00:00:01.000Z
  checked: dependencyUtils.ts lines 452-484
  found: `computeParentProgress` function exists and calculates parent progress from children (weighted average by duration)
  implication: Parent tasks DO have computed progress values stored in their `progress` field

- timestamp: 2026-03-11T00:00:02.000Z
  checked: GanttChart.tsx lines 372-433
  found: Parent progress is updated via `computeParentProgress` when children change (lines 378, 427)
  implication: Parent task progress values are being computed and stored correctly

- timestamp: 2026-03-11T00:00:03.000Z
  checked: TaskRow.tsx line 292
  found: `{!isParent && progressWidth > 0 && showProgressInside && (` - also blocks internal progress text for parents
  implication: Parent tasks also don't show progress percentage text inside the bar

- timestamp: 2026-03-11T00:00:04.000Z
  checked: User verification in actual application
  found: User confirmed "confirmed fixed" - parent tasks now show progress fill correctly
  implication: Fix is verified and working in production environment

## Resolution
root_cause: TaskRow.tsx line 279 had condition `{!isParent && progressWidth > 0}` which explicitly prevented progress bar rendering for parent tasks. The parent task progress value IS being computed correctly (via `computeParentProgress`) and stored, but the UI simply didn't render it.
fix: Removed `!isParent &&` condition from two places in TaskRow.tsx:
1. Line 279: Progress bar fill rendering (now renders for all tasks with progress > 0)
2. Line 292: Internal progress text rendering (now shows for all tasks with progress)
verification: Hierarchy tests pass (14 tests). User confirmed fix works in actual application. Parent tasks now display progress fill proportional to children's completion.
files_changed:
- D:\Projects\gantt-lib\packages\gantt-lib\src\components\TaskRow\TaskRow.tsx
