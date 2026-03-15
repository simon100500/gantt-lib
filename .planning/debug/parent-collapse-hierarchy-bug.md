---
status: awaiting_human_verify
trigger: "After dragging родитель1 (with children) to a position under родитель2, collapsing/expanding родитель2 also collapses/expands родитель1 with its children"
created: 2026-03-15T00:00:00.000Z
updated: 2026-03-15T01:00:00.000Z
---

## Current Focus

hypothesis: CONFIRMED. Root task (родитель1) got its parentId changed to родитель2's id because the "join group" inference ran for all root tasks including parent tasks with children.
test: 4 regression tests written and passing, validating the fix.
expecting: Human verification that the drag-drop behavior is correct in the running app.
next_action: Human verify the fix in the running browser UI.

## Symptoms

expected: Each parent's collapse/expand button only controls its own direct children. Moving родитель1 below родитель2 should not make родитель1 a child of родитель2 (they should remain siblings at root level, just reordered). Collapse of родитель2 should only hide its own children, not родитель1's group.
actual: After drag-drop reorder (moving родитель1 below родитель2), collapsing родитель2 hides родитель1 and its children too — as if родитель1 became a nested child of родитель2.
errors: No JS errors, just wrong visual/logical behavior
reproduction: |
  1. Create: [родитель1] (root level parent), -деть1, -деть2, [родитель2] (root level parent), -деть2.1
  2. Drag родитель1 below родитель2 (to position after деть2.1)
  3. Click collapse on родитель2
  4. Bug: родитель1 and its children also get hidden
started: Introduced recently as part of drag-drop parent reorder fixes

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-03-15T00:00:00.000Z
  checked: TaskList.tsx handleDrop, lines 619-651 (root task parentId inference block)
  found: |
    After splicing the subtree back in, the code checks `taskAbove` and `taskBelow` to determine if the moved root task should "join a group". The check is:
      if (taskAbove.parentId && taskAbove.parentId !== moved.id) {
        inferredParentId = taskAbove.parentId;
      }
    This runs for ANY root task (moved.parentId is falsy), including parent tasks with children.
    Scenario: родитель1 (a parent) is dragged to after деть2.1 (a child of родитель2).
    After splice, the task immediately above родитель1 is деть2.1, which has parentId = родитель2.id.
    So inferredParentId gets set to родитель2.id — making родитель1 a child of родитель2.
  implication: This is the root cause. The "join group" logic does not exclude parent tasks from being reparented.

- timestamp: 2026-03-15T00:00:00.000Z
  checked: TaskList.tsx isValidParentDrop, lines 335-375
  found: |
    isValidParentDrop correctly BLOCKS dropping a parent between another parent's children (dropTarget.parentId check at line 350-352). However, the scenario here is that родитель1 is dropped at the LAST POSITION — after деть2.1, which is effectively the end of родитель2's group. The drop target at `dropIndex` might be деть2.1 (which has parentId), or it might be beyond the visible list. If the drop is on the "add task" button (visibleTasks.length), isValidParentDrop is not called.
    But the key issue is: even if the drop position passes isValidParentDrop, the POST-SPLICE parentId inference re-assigns parentId based on neighboring tasks.
  implication: The gate (isValidParentDrop) and the assignment (inferredParentId logic) are inconsistent. isValidParentDrop can block drops between children, but the inference logic AFTER the drop still re-parents based on neighbors.

- timestamp: 2026-03-15T00:00:00.000Z
  checked: GanttChart.tsx handleReorder, lines 484-514
  found: |
    GanttChart.handleReorder receives inferredParentId from TaskList.handleDrop and applies it unconditionally to the moved task:
      return { ...t, parentId: inferredParentId || undefined };
    No check whether the moved task is itself a parent. So if inferredParentId = родитель2.id, родитель1 gets parentId = родитель2.id.
  implication: The bug propagates here but originates in TaskList.handleDrop's inference logic.

- timestamp: 2026-03-15T00:00:00.000Z
  checked: Collapse/hide logic in GanttChart.tsx (filteredTasks, lines 218-226) and TaskList.tsx (visibleTasks, lines 166-174)
  found: |
    Both check: if task.parentId is in collapsedParentIds -> hide. After the bug, родитель1.parentId = родитель2.id. When родитель2 is collapsed, its id is in collapsedParentIds, so родитель1 (and everything with родитель1.id as parentId) gets hidden. This correctly explains the symptom.
  implication: Collapse logic is correct. The bug is purely in the drag-drop parentId assignment.

## Resolution

root_cause: |
  In TaskList.tsx handleDrop (lines 619-651), after splicing a moved root task back into the array, the code checks the task immediately above and below to infer whether the moved task should "join a group" (inherit the neighboring task's parentId). This inference runs for ALL root tasks including parent tasks (those that have their own children). When родитель1 is dropped immediately after деть2.1 (a child of родитель2), taskAbove.parentId === родитель2.id, so inferredParentId is set to родитель2.id. GanttChart.handleReorder then applies this parentId to родитель1, making it a child of родитель2. Collapse of родитель2 then hides родитель1 and its subtree because the visibility filter checks task.parentId.

fix: |
  In TaskList.tsx handleDrop, the root task parentId inference block (previously `if (!moved.parentId) { ... }`)
  was changed to `if (!moved.parentId && !hasChildren) { ... }` with an else branch for parent tasks
  that logs they are staying root. This single-line condition change prevents parent tasks from ever
  being assigned a parentId via neighbor inference. Only leaf root tasks can "join a group" from neighbors.

  File changed: packages/gantt-lib/src/components/TaskList/TaskList.tsx (line 622)
  Old: if (!moved.parentId) {
  New: if (!moved.parentId && !hasChildren) {

verification: |
  4 regression tests added in parentCollapseHierarchy.test.ts - all pass.
  1. parent task dropped after last child of another parent must retain parentId=undefined - PASS
  2. parent task dropped at various positions near another parent always keeps parentId=undefined - PASS
  3. leaf (non-parent) root task CAN still join a group when dropped between children - PASS
  4. collapse of родитель2 must not hide родитель1 after it has been moved below родитель2 - PASS
  Full test suite: pre-existing failures unchanged, no new failures.
files_changed:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/__tests__/parentCollapseHierarchy.test.ts (new)
