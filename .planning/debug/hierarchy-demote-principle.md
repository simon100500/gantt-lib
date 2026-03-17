---
status: awaiting_human_verify
trigger: "hierarchy-demote-principle: demote should make previous task the parent, no gaps, create 'Новый раздел' if first"
created: 2026-03-17T00:00:00Z
updated: 2026-03-17T00:00:00Z
---

## Current Focus

hypothesis: The handleDemote in TaskListRow uses allTasks (raw unordered prop) instead of visibleTasks or orderedTasks, AND uses "previous task's parent" (sibling logic) instead of "previous task itself as parent"
test: Read handleDemote code and trace the logic for various hierarchy scenarios
expecting: Confirm wrong behavior and implement corrected version
next_action: implement fix in handleDemote and add "Новый раздел" creation for first-task demote

## Symptoms

expected: When clicking "Demote" on a task:
1. The task immediately above the current task becomes the parent (previous task in flat visible list)
2. If no task above, create "Новый раздел" as a new root parent
3. No hierarchy gaps allowed

actual: Current handleDemote uses `allTasks.findIndex` (raw unsorted prop) then does: `previousTask.parentId || previousTask.id` — this means if previous task already has a parent, the demoted task becomes a SIBLING of the previous task (same parent), not a child of previous task.

errors: No runtime errors - logic/behavior issue

reproduction:
1. Have tasks: Parent A -> Child B -> Child C (C is sibling of B)
2. Click Demote on C
3. Expected: B becomes parent of C (C becomes B's child)
4. Actual: C gets Parent A as parent (sibling of B), because previousTask=B has parentId=A

timeline: New requirement after unlimited nesting implementation

## Eliminated

- hypothesis: handleDemote crashes or throws errors
  evidence: No errors reported, code is syntactically valid
  timestamp: 2026-03-17T00:00:00Z

## Evidence

- timestamp: 2026-03-17T00:00:00Z
  checked: TaskListRow.tsx handleDemote (lines 825-836)
  found: |
    const currentIndex = allTasks.findIndex(t => t.id === task.id);
    if (currentIndex > 0) {
      const previousTask = allTasks[currentIndex - 1];
      const targetParentId = previousTask.parentId || previousTask.id;
      onDemoteTask?.(task.id, targetParentId);
    }
  implication: |
    BUG 1: Uses `allTasks` (raw prop, original insertion order) not `orderedTasks`/`visibleTasks` (hierarchy-sorted).
    So "previous task" may be wrong when tasks are stored in insertion order but displayed in hierarchy order.
    BUG 2: Logic `previousTask.parentId || previousTask.id` makes the demoted task a sibling of previousTask
    (same parent) instead of a child of previousTask. This is the wrong principle.
    BUG 3: No handling for first task case (no "Новый раздел" creation).

- timestamp: 2026-03-17T00:00:00Z
  checked: TaskList.tsx line 732 - allTasks prop passed to TaskListRow
  found: allTasks={tasks} — the raw unordered tasks prop from consumer
  implication: Confirmed allTasks is unsorted. orderedTasks (normalizeHierarchyTasks result) is not passed down.

- timestamp: 2026-03-17T00:00:00Z
  checked: TaskList.tsx canDemote condition (HierarchyButton rowIndex > 0)
  found: rowIndex is the visible row index (from visibleTasks map). So canDemote=false only for first visible row.
  implication: The "no task above" (first task) case is already guarded by UI (button hidden).
    But if we want "Новый раздел" creation when first task, we need to handle rowIndex === 0 differently
    (or let it show the button and handle in callback).

- timestamp: 2026-03-17T00:00:00Z
  checked: GanttChart.tsx handleDemoteTask (lines 615-669)
  found: Receives (taskId, newParentId) and sets task.parentId = newParentId. Correct if newParentId is right.
  implication: The GanttChart handler is correct — it just applies the parentId change. The bug is entirely
    in how handleDemote in TaskListRow calculates newParentId.

- timestamp: 2026-03-17T00:00:00Z
  checked: TaskList.tsx - orderedTasks and visibleTasks availability
  found: orderedTasks = normalizeHierarchyTasks(tasks), visibleTasks = filtered for collapsed.
    Neither is passed to TaskListRow currently.
  implication: To fix handleDemote, we need to either:
    a) Pass orderedTasks/visibleTasks down to TaskListRow, or
    b) Move handleDemote logic up to TaskList.tsx where orderedTasks is available

## Resolution

root_cause: |
  handleDemote in TaskListRow.tsx used the wrong input array (`allTasks` = raw unsorted prop instead of
  visibleTasks which is hierarchy-sorted) and the wrong logic: `previousTask.parentId || previousTask.id`
  makes the demoted task a sibling of previousTask (using the same parent), NOT a child of previousTask.
  Additionally, HierarchyButton blocked demote for rowIndex===0, preventing "Новый раздел" creation.

fix: |
  1. Added handleDemoteWrapper in TaskList.tsx using visibleTasks (correctly ordered):
     - Normal case: onDemoteTask(taskId, visibleTasks[taskIndex - 1].id) — previous task becomes parent
     - First-task case (taskIndex === 0): creates "Новый раздел" root task, builds full updated task
       array, calls onReorder() atomically (GanttChart's handleReorder calls onTasksChange with it)
  2. Simplified handleDemote in TaskListRow.tsx to just call onDemoteTask(taskId, '') — no calculation
  3. Changed HierarchyButton canDemote from `onDemote && rowIndex > 0` to `!!onDemote` — Demote button
     now shown for first row too, enabling "Новый раздел" creation
  4. TaskList passes handleDemoteWrapper instead of raw onDemoteTask to TaskListRow

verification: Build passes (tsup), pre-existing test failures unchanged (13 dateUtils tests were failing before)
files_changed:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
