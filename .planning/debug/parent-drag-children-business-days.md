---
status: investigating
trigger: "Investigate issue: parent-drag-children-business-days"
created: 2026-03-20T00:00:00Z
updated: 2026-03-20T00:18:00Z
---

## Current Focus

hypothesis: Confirmed. Fix RULE 1 in `universalCascade` so hierarchy children move by the parent's business-day offset and rebuild their end date from preserved business duration.
test: Patch RULE 1, add regression tests for `universalCascade` child dates and `useTaskDrag` preview overrides in business-days mode, then run the targeted test files.
expecting: Child start/end dates stay on working days, widths expand across skipped weekends, and preview/persisted results match because both consume corrected cascade output.
next_action: edit `dependencyUtils.ts` and add focused regression tests

## Symptoms

expected: When a parent is shifted and its children move with it, every child should preserve business-day duration, never start on a weekend, never end on a weekend, and bar widths should expand across weekends immediately so visual and stored dates stay aligned.
actual: On parent drag, children are shifted internally without enforcing working-day invariants. Child tasks can land with start/end on weekends, duration is not re-expanded across weekends, and the rendered bars do not reflect proper business-day ranges.
errors: No explicit runtime error reported for this issue.
reproduction: Enable business-days mode. Drag a parent task so its children shift. Observe child tasks after the move; they can begin/end on weekends and their bars are not stretched to cover skipped weekend days.
started: This became visible after the recent workday/lag refactor where businessDays became default and lag became a primary invariant.

## Eliminated

## Evidence

- timestamp: 2026-03-20T00:10:00Z
  checked: packages/gantt-lib/src/utils/dependencyUtils.ts
  found: `universalCascade` RULE 1 moves hierarchy children with raw `startDeltaMs`/`endDeltaMs` added to original child dates, unlike RULE 3 which uses `calculateSuccessorDate` plus `buildTaskRangeFromStart/End` with `businessDays`.
  implication: Parent-drag child moves bypass working-day snapping and duration-preserving weekend expansion, so child stored dates can land on weekends in business-days mode.

- timestamp: 2026-03-20T00:10:00Z
  checked: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  found: `handleTaskChange` routes dragged tasks through `universalCascade(updatedTask, newStart, newEnd, tasks, businessDays, isCustomWeekend)` when constraints are enabled.
  implication: Parent drags persist whatever dates `universalCascade` emits for children; there is no later normalization layer in the chart component.

- timestamp: 2026-03-20T00:18:00Z
  checked: packages/gantt-lib/src/hooks/useTaskDrag.ts and packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
  found: Drag preview converts the dragged bar into dates, runs `universalCascade`, and `TaskRow` renders preview bars directly from those override dates/widths.
  implication: The visual preview divergence is not a separate bug; preview and final persisted state share the same incorrect RULE 1 child-shift computation.

## Resolution

root_cause: In `universalCascade` RULE 1, hierarchy children inherit parent motion via raw calendar millisecond deltas (`startDeltaMs`/`endDeltaMs`). In business-days mode that bypasses working-day snapping and duration-preserving range rebuilds, so parent-dragged children can land on weekends and render with calendar-day widths instead of business-day-expanded spans.
fix:
verification:
files_changed: []
