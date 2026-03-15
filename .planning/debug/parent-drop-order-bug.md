---
status: verifying
trigger: "Investigate issue: parent-drop-order-bug - When dragging a parent task to another root-level position, the parent moves to the end of the list with children appearing above it (wrong hierarchy)"
created: 2026-03-14T00:00:00.000Z
updated: 2026-03-15T09:45:00.000Z
---

## Current Focus
hypothesis: CONFIRMED AND FIXED - getVisibleReorderPosition was using dropVisibleIndex as an index into visibleWithoutMoved, causing wrong results when visibleWithoutMoved has fewer items (subtree removed).
test: All 8 unit tests pass (parentDropSelf: 4, parentDropOrder: 4). New regression test added covering exact bug scenario.
expecting: Dropping parent ON next root task correctly inserts it after the target's full group. No-op scenarios still work.
next_action: Human verification in browser - confirm the drag behavior works correctly

## User Feedback (Latest)
"Parent group moves N tasks BELOW where it should be! Also, if you try to move the moved group again, you can't move it between groups (as if the moved group doesn't update index and doesn't allow moving). Check what IDs you're updating."

Translation:
1. Parent group is inserted at wrong position - N tasks below target
2. After moving, subsequent moves don't work - indices seem incorrect

### New Test Case
When dropping a parent task below itself (in the drop zone after its own children), nothing should happen. This is a defensive check to prevent invalid moves.

**Test scenario:**
```
[родитель1]
-деть1
-деть2
----сюда----  (dropping parent1 here - below itself)
```

Expected: No change - parent stays in place with children.

## Symptoms
expected: When dropping parent1 between parent2 and parent3, parent1 should move to that position with children still nested under it. Parent should always appear before its children in the final order.
actual: Parent moves to the very end of the task list. Children appear above the parent in the hierarchy.
errors: Wrong hierarchy - children above parent after drop
reproduction: |
  1. Create tasks with this structure:
     [родитель1]
     -ребёнок1.1
     -ребёнок1.2
     [родитель2]
     -ребёнок2.1
     -ребёнок2.2

  2. Drag родитель1 to drop position after родитель2
  3. Expected result:
     [родитель2]
     -ребёнок2.1
     -ребёнок2.2
     [родитель1]
     -ребёнок1.1
     -ребёнок1.2

  4. Actual result:
     -ребёнок1.1
     -ребёнок1.2
     [родитель1] (at the end)

Additional constraint: Even if backend sends wrong order, the frontend should enforce correct hierarchy - parents first, then children within each parent.
started: Started recently - this is a new issue distinct from the resolved parent-move-children-batch (which was about duplicate callbacks)

## Eliminated
- hypothesis: getVisibleReorderPosition returns wrong insertIndex for parent tasks
  evidence: Test shows getVisibleReorderPosition returns correct insertIndex (3 for dropIndex=4)
  timestamp: 2026-03-14T00:00:05.000Z

- hypothesis: flattenHierarchy doesn't preserve parent-before-children order
  evidence: Test shows flattenHierarchy always produces correct hierarchy - parents before children
  timestamp: 2026-03-14T00:00:05.000Z

- hypothesis: normalizeHierarchyTasks doesn't call flattenHierarchy
  evidence: normalizeHierarchyTasks calls flattenHierarchy as its first step
  timestamp: 2026-03-14T00:00:05.000Z

- hypothesis: The reorder logic in TaskList/GanttChart is wrong
  evidence: Unit tests show the reorder logic produces correct order when given correct input
  timestamp: 2026-03-14T00:00:06.000Z

- hypothesis: handleReorder in page.tsx only updated parentId instead of using the full reorderedTasks array
  evidence: Fix was applied (using full reorderedTasks array), but issue persists
  timestamp: 2026-03-14T00:00:08.000Z

## Evidence
- timestamp: 2026-03-14T00:00:01.000Z
- timestamp: 2026-03-14T00:00:01.000Z
  checked: TaskList.tsx handleDrop function (lines 336-516)
  found: The drop handler removes only the moved task from the array and splices it at the insertIndex. For parent tasks, it does NOT move the children along with the parent.
  implication: When moving a parent task, only the parent is repositioned in the array. Children stay at their original positions. When normalizeHierarchyTasks is called, it uses flattenHierarchy which walks parents first, then children. But since children are still at their old positions (after where parent was removed), they end up appearing before the parent in the final order.

- timestamp: 2026-03-14T00:00:02.000S
  checked: normalizeHierarchyTasks and flattenHierarchy in hierarchyOrder.ts
  found: flattenHierarchy builds a depth-first tree walk: for each parent, it adds the parent to result, then recursively adds all children. This assumes children come after their parent in the input array.
  implication: When the reorder array has children positioned BEFORE the parent (because parent was removed but children stayed), flattenHierarchy still processes them correctly by building the tree from parentId links. But the ORDER in the final array depends on how tasks appear in the input to flattenHierarchy.

- timestamp: 2026-03-14T00:00:03.000S
  checked: handleReorder in GanttChart.tsx (lines 464-533)
  found: handleReorder receives reorderedTasks, calls normalizeHierarchyTasks on it, then emits to onTasksChange. normalizeHierarchyTasks calls flattenHierarchy which rebuilds the tree.
  implication: The flattenHierarchy function determines the final order. It processes tasks by building a tree from parentId links, then doing a depth-first walk starting from root tasks (parentId undefined). The order of siblings is preserved from the input array.

- timestamp: 2026-03-14T00:00:04.000S
  checked: getVisibleReorderPosition in taskListReorder.ts
  found: The function maps visible drop position to orderedTasks position. It finds the drop target in orderedTasks and returns that as insertIndex.
  critical finding: When a parent task is moved, getVisibleReorderPosition returns the position of the VISIBLE task at the drop index. But if the drop target is a CHILD of another parent, the returned insertIndex points to that child's position. This means the moved parent will be inserted AT the child's position, not after the parent.

- timestamp: 2026-03-14T00:00:05.000S
  checked: Created unit test parentDropOrder.test.ts to reproduce the issue
  found: ALL test cases show that normalizeHierarchyTasks produces correct hierarchy - parents always appear before their children. The reorder logic is working correctly.
  critical finding: The issue is NOT in the reorder/flattenHierarchy logic. The bug must be in how tasks are stored or passed to the component.

- timestamp: 2026-03-14T00:00:06.000S
  checked: packages/website/src/app/page.tsx handleReorder function (lines 629-642)
  found: handleReorder receives the normalized reorderedTasks array from GanttChart.handleReorder, but instead of using the full array, it only updates the parentId of the moved task:
  ```javascript
  setTasks(reorderedTasks.map(t =>
    t.id === movedTaskId
      ? { ...t, parentId: inferredParentId || undefined }
      : t
  ));
  ```
  root_cause: This causes the tasks state to have the OLD order with the updated parentId. When the component re-renders, orderedTasks = normalizeHierarchyTasks(tasks) produces a different order than intended because the input array has the wrong order.
  The fix is to simply use the full reorderedTasks array: `setTasks(reorderedTasks);`

- timestamp: 2026-03-14T00:00:07.000S
  checked: Applied fix to handleReorder and handleHierarchyReorder in page.tsx
  found: Changed both functions to use the full reorderedTasks array instead of just updating parentId
  unit_test_result: All 4 unit tests pass, including the new test that demonstrates the buggy vs fixed behavior
  verification_status: Awaiting manual verification in browser

- timestamp: 2026-03-14T00:00:08.000Z
  checked: Manual verification in browser
  found: Fix did NOT work. Issue persists - parent still moves to end with children above it.
  implication: The root cause diagnosis was incorrect. The issue is elsewhere in the pipeline.

- timestamp: 2026-03-14T00:00:09.000Z
  checked: Adding comprehensive logging throughout the reorder pipeline
  found: Added logging to:
    1. flattenHierarchy in hierarchyOrder.ts - shows input/output arrays and parent map
    2. normalizeHierarchyTasks in hierarchyOrder.ts - shows input/output and parent date normalization
    3. GanttChart.handleReorder - shows normalized output
    4. page.tsx handleReorder - shows what's received and stored
    5. TaskList orderedTasks memo - shows what's computed from tasks prop
  implication: The logs will reveal exactly where the incorrect order originates

- timestamp: 2026-03-14T00:00:10.000Z
  checked: User provided logs showing the problem
  found: User's logs confirm:
    1. Tasks 5, 6, 7 (children of task 4) are added as "Unvisited task added" at positions 19, 20, 21
    2. Task 4 (parent) is added at position 22
    3. This happens because handleDrop only moves the parent, not its children
  root_cause: In TaskList.tsx, the handleDrop function only moves the dragged parent task to the new position. Children remain at their original array indices. When flattenHierarchy processes this, it encounters children before their parent, causing incorrect hierarchy.

- timestamp: 2026-03-14T00:00:11.000Z
  checked: Implementing fix to move entire subtree when dragging parent task
  found: Applied fix:
    1. Added getAllDescendants() helper function to TaskList.tsx
    2. Modified handleDrop to extract and move entire subtree (parent + all descendants)
    3. Updated getVisibleReorderPosition to filter out descendants when calculating insert index
  implication: When dragging a parent task, the entire subtree moves together, maintaining correct array order (parent before children)

- timestamp: 2026-03-14T00:00:12.000Z
  checked: User feedback - hierarchy preserved but group moves to bottom
  found: User reports: "Hierarchy preserved but group moves to bottom of list. Should not move under own children."
  critical finding: The issue is in the insertIndex calculation in handleDrop. The getVisibleReorderPosition function returns insertIndex relative to reorderedWithoutMoved (array WITHOUT the subtree). Then handleDrop does:
    ```javascript
    const adjustedInsertIndex = originOrderedIndex < insertIndex
      ? insertIndex - subtreeCount
      : insertIndex;
    ```
  bug: This subtracts subtreeCount from insertIndex, but insertIndex is ALREADY relative to the array without the subtree. After splicing, reordered = reorderedWithoutMoved, so we should use insertIndex directly, not insertIndex - subtreeCount.
  implication: The adjustedInsertIndex becomes too small (or even negative), causing the subtree to be inserted at the wrong position, potentially at the end of the array.

- timestamp: 2026-03-14T00:00:13.000Z
  checked: Fixing the insertIndex calculation bug
  found: Fixed by changing:
    ```javascript
    // OLD (WRONG):
    const adjustedInsertIndex = originOrderedIndex < insertIndex
      ? insertIndex - subtreeCount
      : insertIndex;

    // NEW (CORRECT):
    const adjustedInsertIndex = insertIndex;
    ```
  Also enhanced isValidParentDrop to prevent parent from being dropped under its own descendants (cycle prevention).
  Added comprehensive logging to trace the entire drop operation.
  implication: The subtree should now be inserted at the correct position. Parent cannot be dropped under its own children.

- timestamp: 2026-03-14T00:00:14.000Z
  checked: User feedback - parent group moves N tasks BELOW target, can't move again
  found: User reports two issues:
  1. Parent group is inserted at wrong position - N tasks below where it should be
  2. After moving, subsequent moves don't work - as if indices aren't updated

  Analysis: The issue is likely in how insertIndex maps to the final position.

  In getVisibleReorderPosition:
  - When moving DOWN, visibleInsertIndex = dropVisibleIndex - 1
  - This adjustment is for the VISIBLE array
  - But when mapping to reorderedWithoutMoved, we need to consider the full array

  Key insight: The drop position might be BETWEEN items, not ON an item.
  - If dropIndex=4 means "insert between item 3 and item 4"
  - Then when moving DOWN, we should subtract 1 to get the target position
  - But this logic is on visibleTasks, not orderedTasks

  Potential issue: The mapping from visibleWithoutMoved to reorderedWithoutMoved
  might be off when there are collapsed/hidden tasks.

  Added comprehensive logging to getVisibleReorderPosition to trace exact indices.

- timestamp: 2026-03-15T09:45:00.000Z
  checked: getVisibleReorderPosition when dragging H1(idx 0) to H2(idx 3) with [H1,H1-1,H1-2,H2,H2-1,H2-2,H3]
  found: OLD code: dropVisibleIndex(3) >= visibleWithoutMoved.length-1(3) -> TRUE -> appendsAtEnd (insertIndex=4). WRONG. H1 moves past H3.
  fix_evidence: New code looks up H2 by ID in visibleWithoutMoved -> finds at filteredIdx=0 -> H2 has descendants -> lastDescendant H2-2 at orderedIdx=2 -> insertIndex=3 -> H1 inserts correctly between H2-2 and H3.
  unit_test: Added regression test in parentDropSelf.test.ts verifying insertIndex=3 for this exact scenario. All 8 tests pass.

- timestamp: 2026-03-14T00:00:16.000Z
  checked: New test case - dropping parent task below itself
  found: Created test file parentDropSelf.test.ts with 3 test cases:
    1. Parent dropped below its own group (dropIndex=3, group occupies indices 0-2)
    2. Parent dropped on its last child
    3. Multiple parents - dropping one at end of list
  All tests PASS. The key finding: When dropping a parent below itself (after all its children),
  getVisibleReorderPosition detects that visibleWithoutMoved is empty (all tasks filtered out)
  and returns insertIndex=0. This causes the subtree to be removed and reinserted at the same
  position - a no-op as expected.
  test_result: All 3 tests pass
  implication: Dropping a parent on itself is already handled correctly by the existing logic.
  When the entire subtree is filtered out (no other tasks remain), insertIndex=0 means
  "insert at beginning of empty array" which after removing the subtree results in no change.
  files_changed: [packages/gantt-lib/src/__tests__/parentDropSelf.test.ts (new file)]

## Resolution
root_cause: In getVisibleReorderPosition, the code used `dropVisibleIndex` (an index into the ORIGINAL visibleTasks array) directly as an index into `visibleWithoutMoved` (a FILTERED array with the moved subtree removed, so smaller).

The old condition was:
  ```js
  if (dropVisibleIndex >= visibleWithoutMoved.length - 1) {
    return { insertIndex: reorderedWithoutMoved.length }; // append at end
  }
  targetVisibleIndex = dropVisibleIndex; // WRONG: uses original index in filtered array
  ```

Concrete example: tasks=[H1(0), H1-1(1), H1-2(2), H2(3), H2-1(4), H2-2(5), H3(6)]
- Drag H1 (originIdx=0) to H2 (dropVisibleIndex=3)
- visibleWithoutMoved = [H2, H2-1, H2-2, H3] (length=4 after removing H1 subtree)
- OLD check: 3 >= 4-1 (3) → TRUE → append at END (insertIndex=4)
- Result: H1 group moves PAST H3, ending at very bottom
- User expected: H1 group to appear AFTER H2 group (before H3)

fix: Rewrote the index lookup logic to use ID-based task lookup instead of direct index comparison.
  New logic:
  1. Look up the drop target task by its position in the ORIGINAL visibleTasks (by ID)
  2. Find that same task in visibleWithoutMoved using findIndex (ID-based)
  3. Use the FILTERED index as targetVisibleIndex for all subsequent calculations
  4. Special case: if dropTargetTask not in list (beyond end) → append at end
  5. Special case: if dropTargetTask was part of moved subtree → append at end (defensive)

files_changed:
  - packages/gantt-lib/src/utils/taskListReorder.ts (fix - rewritten index lookup logic)
  - packages/gantt-lib/src/__tests__/parentDropOrder.test.ts (updated 2 tests to use full subtree move + valid drop positions)
  - packages/gantt-lib/src/__tests__/parentDropSelf.test.ts (added regression test for the exact bug scenario)

verification: 8 tests pass (4 parentDropSelf, 4 parentDropOrder). New regression test explicitly verifies that dropping H1 ON H2 gives insertIndex=3 (correct) not insertIndex=4 (wrong end of list).
