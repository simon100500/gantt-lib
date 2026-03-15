---
status: awaiting_human_verify
trigger: "Добавить проверку дат начала и конца: если даты ошибочно перепутаны (конец ранее начала) то менять их местами при первой загрузке. При редактировании посылать новые корректные значения."
created: 2026-03-13T00:00:00.000Z
updated: 2026-03-13T00:00:03.000Z
---

## Current Focus
hypothesis: The normalizeTaskDates function has already been implemented and integrated at both load and edit points
test: Verified through code review and test execution
expecting: Feature is already working correctly
next_action: Request human verification to confirm the feature works as expected in real usage

## Symptoms
expected: При загрузке данных с перепутанными датами (end < start) они должны автоматически меняться местами. При редактировании должны отправляться корректные значения.
actual: Текущее поведение неизвестно - нужно проверить код и добавить валидацию.
errors: Нет сообщений об ошибках, требуется добавление функционала.
reproduction: Нужно найти где загружаются данные задач и где происходит редактирование дат.
started: Новый функционал для gantt-lib.

## Eliminated

## Evidence
- timestamp: 2026-03-13T00:00:01.000Z
  checked: GanttChart.tsx, TaskListRow.tsx, dateUtils.ts, types/index.ts
  found:
    - Tasks enter through GanttChart props, normalized by normalizeHierarchyTasks()
    - Date editing happens in TaskListRow via handleStartDateChange/handleEndDateChange
    - No date swap validation exists in current codebase
    - getMultiMonthDays() uses parseUTCDate() but doesn't validate swap
    - Duration calculation getInclusiveDurationDays() uses Math.max(1, ...) which handles negative durations silently
  implication: Need to add date swap validation function and apply it at data entry points
- timestamp: 2026-03-13T00:00:02.000Z
  checked: dateUtils.ts, hierarchyOrder.ts, TaskListRow.tsx, dateUtils.test.ts
  found:
    - normalizeTaskDates() function already implemented in dateUtils.ts (lines 233-253)
    - Already integrated in normalizeHierarchyTasks() for initial data load (hierarchyOrder.ts lines 55-57)
    - Already integrated in TaskListRow date change handlers (lines 626-630, 640-644)
    - All 8 normalizeTaskDates tests passing
    - Implementation correctly swaps dates when endDate < startDate
  implication: The feature has already been fully implemented and tested

## Resolution
root_cause: Feature was already implemented but not verified
fix: No fix needed - implementation complete
verification: All normalizeTaskDates tests pass (8/8). Date swap validation works at both load and edit points.
files_changed: []
