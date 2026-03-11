---
status: resolved
trigger: "Child task dragged above parent should exit group (lose indent, stop affecting parent bar)"
created: 2026-03-11T00:00:00.000Z
updated: 2026-03-11T00:00:14.000Z
---

## Current Focus
hypothesis: FIXED - Found and fixed the bug in THREE places. The condition `if (movedTaskId && inferredParentId !== undefined)` prevented undefined values from clearing parentId. Changed to `if (movedTaskId)` in all three functions.
test: User should test dragging a child task above its parent
expecting: Child should now correctly exit the group (no indent, no effect on parent bar duration)
next_action: User to verify fix works in both main demo and hierarchy demo

## Symptoms
expected: Child task dragged above parent should move above parent AND exit the group (no indent, no effect on parent bar duration)
actual: Child moves above parent visually but remains in the group (indent preserved, still affects parent bar)
errors: None - behavior bug, not crash
reproduction: |
  1. Start with flat list of tasks
  2. Create a parent task and 3-4 child tasks under it
  3. Drag one child task by its handle above the parent
  4. Result: child appears above parent but still has indent and affects parent bar
started: Never worked correctly - this is core hierarchy behavior

## Eliminated

## Evidence
- timestamp: 2026-03-11T00:00:00.000Z
  checked: TaskList.tsx handleDrop function (lines 289-337)
  found: The function uses simplified parentId inference that checks taskAbove and taskBelow for parentId, but doesn't consider if the moved task is a child being moved above its own parent
  implication: When child is dragged above parent, the inference logic may incorrectly keep the parentId or inherit from another task

- timestamp: 2026-03-11T00:00:00.000Z
  checked: TaskList.tsx parentId inference logic (lines 312-330)
  found: The logic only checks: 1) if taskAbove has parentId -> inherit it, 2) if taskBelow has parentId -> inherit it, 3) otherwise stays undefined. It never checks if the moved task itself has a parentId that should be cleared.
  implication: The moved task's original parentId is never explicitly cleared when moving above its parent

- timestamp: 2026-03-11T00:00:00.000Z
  checked: GanttChart.tsx handleReorder (lines 498-511)
  found: handleReorder applies inferredParentId to movedTaskId, but the logic is: `inferredParentId || undefined` which means if TaskList passes undefined, it clears the parentId. If TaskList passes a parentId, it sets it.
  implication: The fix must be in TaskList.tsx - it needs to detect when child moves above parent and pass undefined (not inherit parentId from siblings)

- timestamp: 2026-03-11T00:00:00.000Z
  checked: The exact scenario when child moves above parent
  found: When child task is dragged above its parent:
    1. insertIndex will be 0 or less than parent's index
    2. taskAbove will be either undefined (at index 0) or a root task
    3. taskBelow will be the parent or a sibling with same parentId
    4. Current logic: if taskBelow has parentId, it inherits it - WRONG!
  implication: The logic should check if moved task's original parent is at or below insertIndex, and if so, clear the parentId

- timestamp: 2026-03-11T00:00:01.000Z
  checked: The attempted fix and why it failed
  found: The fix set `inferredParentId = undefined` when child moves above parent, but then the condition `if (inferredParentId === undefined)` was true, so it re-ran the normal inference logic and inherited parentId from taskBelow, overriding the exit-group decision
  implication: Need a flag variable to track that the exit-group decision was already made

- timestamp: 2026-03-11T00:00:02.000Z
  checked: User's second complaint: child moved below group (not adjacent) stays in group
  found: When child is dragged below all siblings but before a root task:
    1. taskAbove is a sibling with parentId
    2. taskBelow is a root task with no parentId
    3. Current logic: taskAbove has parentId, so inherit it - WRONG!
  implication: The logic "prefer taskAbove" is wrong for this case. A child moved outside its group (above or below) should exit the group, not inherit from siblings

- timestamp: 2026-03-11T00:00:03.000Z
  checked: New approach: calculate group range
  found: For tasks with a parentId, find parent's index and the last child's index (groupEnd). If insertIndex is outside [parentIndex, groupEnd], the task is leaving the group and should exit. Otherwise, it stays in the group.
  implication: This handles both "above parent" (insertIndex < parentIndex) and "below all siblings" (insertIndex > groupEnd) cases

- timestamp: 2026-03-11T00:00:04.000Z
  checked: Edge case: what is "below the group"?
  found: The phrase "child moved below group (not adjacent)" likely means dropping AFTER all siblings, not between them. In UI terms: dropIndex = tasks.length (at the very end), which places the task after the last element.
  implication: The current logic should handle this because groupEnd is the last child, and inserting after all tasks (index >= groupEnd + 1) means leaving the group. However, need to verify in actual usage.

- timestamp: 2026-03-11T00:00:05.000Z
  checked: Previous implementation - discovered CRITICAL BUG
  found: The parent/group range calculation was done AFTER splicing moved task into reordered. When we search for parent in reordered, the moved task is already at its new position, breaking the logic.
  implication: Need to calculate parent/group range BEFORE splicing moved task back in

- timestamp: 2026-03-11T00:00:06.000Z
  checked: Second bug discovered: condition was `insertIndex < parentIndex` but should be `insertIndex <= parentIndex`
  found: When dragging child above parent, insertIndex equals parentIndex (child is inserted AT parent's position). After splicing, child is at index N, parent shifts to N+1. But with `<` condition, `insertIndex == parentIndex` evaluates to false, so child stays in group.
  implication: Need `<=` instead of `<` to handle the case where child is inserted at parent's exact position

- timestamp: 2026-03-11T00:00:07.000Z
  checked: User reported fix still not working
  found: After applying both fixes (calculate range before splice, use <= instead of <), the child still does not exit group when dragged above parent.
  implication: Either the fix was not applied correctly, or there's a deeper issue with the logic that needs debugging with runtime logs

- timestamp: 2026-03-11T00:00:08.000Z
  checked: Added comprehensive logging per user request ("логируй. пиши там позицию, ребёнок или родитель и т.п.")
  found: Added console.log statements throughout handleDrop that log:
    1. Moved task: ID, name, type (CHILD/PARENT/ROOT), parentId, originIndex, dropIndex, insertIndex, drag direction
    2. For child tasks: parentIndex, numSiblings, groupEnd, group range, condition evaluation results
    3. Decision with reasoning (exit group, stay in group, join group, etc.)
  implication: User will now get detailed console output showing exactly what values are being calculated, which will help identify the root cause

- timestamp: 2026-03-11T00:00:09.000Z
  checked: User confirmed logs show correct logic (inferredParentId: undefined, willExitGroup: true) but task still stays in group
  found: ROOT CAUSE FOUND - In GanttChart.tsx handleReorder line 501, condition `if (movedTaskId && inferredParentId !== undefined)` prevents clearing parentId when inferredParentId is undefined. TaskList correctly calculates undefined (exit group), but the downstream code never applies it because the condition is false.
  implication: Need to change condition to `if (movedTaskId)` to allow undefined values to clear parentId

## Resolution
root_cause: In GanttChart.tsx handleReorder function, the condition `if (movedTaskId && inferredParentId !== undefined)` prevented clearing parentId when inferredParentId was undefined. This SAME BUG existed in page.tsx handleReorder and handleHierarchyReorder functions. The execution flow: TaskList calls onReorder (GanttChart.handleReorder) -> calls onChange (correctly sets parentId: undefined) -> calls onReorder (page.handleReorder) -> condition is FALSE, calls setTasks(reorderedTasks) with STALE DATA that overwrites the correct fix.

fix:
1. GanttChart.tsx handleReorder: Changed condition from `if (movedTaskId && inferredParentId !== undefined)` to `if (movedTaskId)`
2. page.tsx handleReorder: Changed condition from `if (movedTaskId && inferredParentId !== undefined)` to `if (movedTaskId)`
3. page.tsx handleHierarchyReorder: Changed condition from `if (movedTaskId && inferredParentId !== undefined)` to `if (movedTaskId)`

verification: USER CONFIRMED - User verified dragging a child task above its parent now correctly exits the group (no indent, doesn't disappear when parent is collapsed). Fix working in both main demo and hierarchy demo.

files_changed:
- packages/gantt-lib/src/components/GanttChart/GanttChart.tsx (fixed condition)
- packages/website/src/app/page.tsx (fixed handleReorder and handleHierarchyReorder conditions)

- timestamp: 2026-03-11T00:00:11.000Z
  checked: User confirmed fix didn't work despite TaskList logs showing correct logic
  found: TaskList shows inferredParentId: undefined, willExitGroup: true, but task still stays in group. This means the issue is either: 1) inferredParentId is not actually undefined when reaching GanttChart (something transforms it), 2) onChange callback is not actually applying the change, 3) Another code path is overriding the parentId after onChange returns, 4) The map operation is running but not persisting the change
  implication: Need runtime logging in GanttChart.handleReorder to see actual values and execution flow

- timestamp: 2026-03-11T00:00:12.000Z
  checked: User's checkpoint revealed handleReorder is called TWICE with stale state
  found: GanttChart.handleReorder calls onChange (correctly sets parentId: undefined) THEN calls onReorder (page.handleReorder). page.handleReorder has condition `if (movedTaskId && inferredParentId !== undefined)` which is FALSE when inferredParentId is undefined, so it calls `setTasks(reorderedTasks)` which overwrites the correct update with stale data (still has parentId: '5').
  implication: The fix in GanttChart.handleReorder was correct, but page.handleReorder has the same bug and overwrites it. Need to fix page.handleReorder condition too.
