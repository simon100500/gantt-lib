---
status: awaiting_human_verify
trigger: "parent-task-resize-boundary"
created: 2026-03-11T00:00:00.000Z
updated: 2026-03-11T00:00:07.000Z
---

## Current Focus
hypothesis: Parent task updates are computed in handleCascade (lines 526-534) but resize operations that go through handleTaskChange (lines 352-439) bypass parent date updates when onCascade is called early
test: Trace execution path for resize vs move to identify where parent updates diverge
expecting: resize-right calls handleCascade which returns early, skipping parent date updates in handleTaskChange
next_action: Analyze the early return in handleCascade path

## Symptoms
expected: Границы родительской задачи должны расширяться или сжиматься при изменении длительности дочерней
actual: Родительская задача на мгновение принимает правильный размер, но затем возвращается к исходному размеру
errors: Нет ошибок в консоли браузера
reproduction: |-
  1. Есть родительская задача с дочерними
  2. Растягиваю правый край любой дочерней задачи
  3. Родительская задача на мгновение принимает правильный размер
  4. Родительская задача возвращается к исходному размеру
started: Проблема существовала всегда, это не регрессия
important: С перемещением (drag) дочерней задачи родитель обновляется корректно

## Eliminated

## Evidence
- timestamp: 2026-03-11T00:00:01.000Z
  checked: useTaskDrag.ts and GanttChart.tsx to understand drag/resize flow
  found: Both resize and move operations go through the same handleComplete callback (line 665 in useTaskDrag.ts)
  implication: The issue is not in the drag hook itself but in how GanttChart handles the completion

- timestamp: 2026-03-11T00:00:02.000Z
  checked: useTaskDrag.ts handleComplete function (lines 665-809)
  found: When cascade chain exists, onCascade is called (line 792) and function returns early (line 793), bypassing onDragEnd
  implication: Resize operations with cascades go through handleCascade, not handleTaskChange

- timestamp: 2026-03-11T00:00:03.000Z
  checked: GanttChart.tsx handleCascade function (lines 526-534)
  found: handleCascade only updates cascaded tasks, does NOT update parent dates
  implication: Parent date updates are skipped for resize operations that trigger cascades

- timestamp: 2026-03-11T00:00:04.000Z
  checked: GanttChart.tsx handleTaskChange function (lines 352-439)
  found: Lines 412-436 contain parent date update logic using computeParentDates
  implication: Parent updates exist in handleTaskChange but are bypassed when handleCascade returns early

- timestamp: 2026-03-11T00:00:05.000Z
  checked: Visual update mechanism during drag (lines 352-410 in useTaskDrag.ts)
  found: Parent position updates visually during drag via hierarchyChain (line 950) and onCascadeProgress (line 951)
  implication: Parent appears correct during drag because of live preview, but reverts to old data when drag completes

## Resolution
root_cause: handleCascade function (lines 526-534) only updates cascaded tasks but does NOT update parent dates. When resizing a child task with cascades, the code path goes through handleCascade and bypasses handleTaskChange which contains parent date update logic (lines 412-436). The parent appears correct during drag due to live preview (hierarchyChain/onCascadeProgress), but reverts when drag completes because parent dates aren't persisted.
fix: Added parent date update logic to handleCascade function (lines 526-547). The fix mirrors the logic in handleTaskChange (lines 416-436): collects parent IDs of cascaded tasks, then updates each parent's dates and progress using computeParentDates and computeParentProgress.
verification:
- All hierarchy tests pass (14/14)
- All dependencyUtils tests pass (44/44)
- The fix adds parent date updates to the cascade completion path, ensuring parent tasks persist their new boundaries after child resize operations
files_changed:
- D:/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
