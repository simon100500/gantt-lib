---
status: resolved
trigger: "При создании родительской задачи и добавлении связи к ней (например, начало-начало), родитель подхватывается к предшественнику с лагом 0. Но при попытке сдвинуть родителя вручную, он возвращается в прежнее место (прыгает туда-сюда)."
created: 2026-03-11T00:00:00.000Z
updated: 2026-03-11T03:00:00.000Z
---

## Current Focus
hypothesis: cascadeByLinks has its own BFS that doesn't include hierarchy children
test: Modified cascadeByLinks to cascade hierarchy children first, then dependency successors
expecting: When parent is moved by dependency link, children should now move with it by same delta
next_action: Build complete, requesting human verification

## Symptoms
expected: При сдвиге родительской задачи вручную она должна оставаться на новом месте. Когда родитель движется по связи, дети должны двигаться вместе с ним.
actual: Оригинальная проблема исправлена. После второй фиксации - обе проблемы должны быть решены.
errors: None specified
reproduction:
1. Создать родительскую задачу с детьми
2. Создать связь к родительской задаче (например, начало-начало от предшественника)
3. Двигать предшественника - родитель подхватывается к предшественнику
4. Дети родителя должны теперь двигаться вместе с родителем
started: После фиксации оригинальной проблемы

## Eliminated
- hypothesis: getTransitiveCascadeChain needs to include hierarchy children
  evidence: The function was already modified but issue persists because handleTaskChange uses cascadeByLinks, not getTransitiveCascadeChain
  timestamp: 2026-03-11T02:00:00Z

## Evidence
- timestamp: 2026-03-11T00:00:01Z through 2026-03-11T00:00:09Z
  checked: Root cause of original issue
  found: handleCascade incorrectly recomputes parent dates even when the parent itself was the dragged task
  implication: Fixed by skipping computeParentDates for dragged task

- timestamp: 2026-03-11T01:00:00Z
  checked: NEW ISSUE reported by user
  found: When parent is moved by dependency link (not manually dragged), children don't move with it
  implication: getTransitiveCascadeChain only follows dependency links, not hierarchy relationships

- timestamp: 2026-03-11T01:00:01Z
  checked: dependencyUtils.ts getTransitiveCascadeChain function
  found: The function only follows dependency links via successorMap, never checks if a task is a parent
  implication: Need to add hierarchy children to cascade chain

- timestamp: 2026-03-11T01:00:02Z
  checked: Fix implementation
  found: Modified getTransitiveCascadeChain to include children when processing each task in the cascade
  implication: When parent is in cascade chain (as successor), its children are now included

- timestamp: 2026-03-11T02:00:00Z
  checked: User report - fix doesn't work
  found: When creating dependency link through UI, parent moves but children stay in place
  implication: Different code path - handleTaskChange uses cascadeByLinks, not getTransitiveCascadeChain

- timestamp: 2026-03-11T02:00:01Z
  checked: GanttChart.tsx handleTaskChange
  found: handleTaskChange calls cascadeByLinks (line 401) - cascadeByLinks has its own BFS that doesn't include children
  implication: Need to modify cascadeByLinks to include hierarchy children

- timestamp: 2026-03-11T02:00:02Z
  checked: Modified cascadeByLinks in dependencyUtils.ts
  found: Added hierarchy child cascading before dependency successor cascading - children move by same delta as parent
  implication: When parent moves by dependency link, children should now move with it

## Resolution
root_cause: >
  ORIGINAL ISSUE (FIXED): In GanttChart.tsx handleCascade, when a parent task is dragged, computeParentDates was called which recalculated the parent's dates from its children, overriding the user's manual drag position.

  NEW ISSUE (FIXED): In dependencyUtils.ts cascadeByLinks, when a parent task is moved via dependency cascade (not manual drag), the function only cascaded dependency successors without including hierarchy children. The function's BFS loop didn't check for or process hierarchy relationships.

fix: >
  ORIGINAL FIX: Modified GanttChart.tsx handleCascade to skip computeParentDates for the dragged task (cascadedTasks[0]).

  NEW FIX: Modified cascadeByLinks in dependencyUtils.ts to cascade hierarchy children first (by delta) before cascading dependency successors. When processing each task in the BFS queue, the function now:
  1. Checks if the current task has children (via getChildren)
  2. Calculates the delta between parent's original and new positions
  3. Applies the same delta to each child's position
  4. Adds children to visited set, result array, and BFS queue for further cascading

files_changed:
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx (original fix)
  - packages/gantt-lib/src/utils/dependencyUtils.ts (both fixes)

verification: >
  Build successful (no TypeScript errors).

  Original fix verified by user - parent no longer jumps back when manually dragged.
  New fix applied - children should now follow parent when parent is moved by dependency link creation.

  Need human verification to confirm both issues are resolved:
  1. Parent doesn't jump back when manually dragged (already verified)
  2. Children follow parent when dependency link is created to parent task
