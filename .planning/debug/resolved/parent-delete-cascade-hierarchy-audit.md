---
status: resolved
trigger: "parent-delete-cascade-and-hierarchy-audit"
created: 2026-03-15T00:00:00.000Z
updated: 2026-03-15T01:00:00.000Z
---

## Current Focus

hypothesis: Part 1 - handleDelete in GanttChart.tsx already has cascade logic BUT only calls onDelete(taskId) not onDelete for each descendant. The consumer's handleDelete in page.tsx filters only by the single taskId, leaving orphaned children. Part 2 - Hierarchy is largely clean (parentId = source of truth) but collapse logic only hides direct children, not deep descendants.
test: Trace the delete flow: GanttChart.handleDelete -> onDelete(taskId) -> page.tsx handleDelete -> prev.filter(t => t.id !== taskId). Children are NOT filtered because they have different IDs.
expecting: Confirmed bug in both. The fix for Part 1 is in page.tsx handleDelete to cascade-delete by parentId chain. Part 2 collapse logic needs depth-aware ancestor check.
next_action: Fix both issues

## Symptoms

expected: |
  1. When a parent task is deleted, all its children (and their descendants) are also deleted automatically
  2. All visual/logical effects (collapse/expand, indentation, visibility) should be derived purely from the parentId hierarchy — no separate state needed
actual: |
  1. Deleting a parent removes only that task; children remain in the list as orphaned (no parent, but still indented/grouped visually)
  2. Suspect: separate tracking of collapse state, indentation, visibility may be inconsistent with the parentId hierarchy
errors: No JS errors, just incorrect behavior
reproduction: |
  1. Create parent1 with child1, child2
  2. Delete parent1
  3. Bug: child1 and child2 remain in the list as orphaned tasks
started: Likely always present — cascade delete was never implemented

## Evidence

- timestamp: 2026-03-15T00:00:00.000Z
  checked: GanttChart.tsx handleDelete (lines 416-446)
  found: |
    handleDelete DOES collect all descendants via collectDescendants(taskId).
    It DOES clean up dependencies referencing deleted tasks via onTasksChange.
    BUT it only calls onDelete(taskId) — passing just the ONE original taskId.
    It does NOT call onDelete for each descendant.
  implication: The library correctly identifies descendants but does not communicate them to the consumer

- timestamp: 2026-03-15T00:00:00.000Z
  checked: page.tsx handleDelete (line 614-616)
  found: |
    handleDelete: (taskId: string) => { setTasks(prev => prev.filter(t => t.id !== taskId)); }
    This filters only the deleted task by ID — not its descendants.
    Children remain because their IDs don't match taskId.
  implication: Root cause of orphaned children bug confirmed

- timestamp: 2026-03-15T00:00:00.000Z
  checked: GanttChart.tsx filteredTasks (lines 218-226)
  found: |
    filteredTasks only checks task.parentId directly against collapsedParentIds.
    Does NOT check ancestor chain — only one level deep.
    A grandchild whose grandparent is collapsed but whose parent is not would remain visible.
  implication: Multi-level collapse is broken — only direct parent collapse hides children

- timestamp: 2026-03-15T00:00:00.000Z
  checked: TaskList.tsx visibleTasks (lines 166-174)
  found: |
    Same single-level check: collapsedParentIds.has(task.parentId).
    Does NOT traverse ancestor chain for multi-level nesting.
  implication: Same bug in TaskList visibility

- timestamp: 2026-03-15T00:00:00.000Z
  checked: Task type definition (types/index.ts)
  found: |
    Task interface has: id, name, startDate, endDate, color, parentId, progress, accepted,
    dependencies, locked, divider. NO stored level/depth/indent fields.
    parentId is the ONLY hierarchy field.
  implication: Type system is clean — hierarchy is purely parentId-based

- timestamp: 2026-03-15T00:00:00.000Z
  checked: hierarchyOrder.ts flattenHierarchy
  found: |
    Correctly uses recursive walk(parentId) to build depth-first order from parentId links.
    No stored depth/level — position in flat array is derived from parentId structure.
  implication: Ordering logic is clean

- timestamp: 2026-03-15T00:00:00.000Z
  checked: normalizeHierarchyTasks
  found: |
    Recomputes parent dates and progress from children — no stored parent state.
    Clean source-of-truth pattern.
  implication: Normalization is clean

## Eliminated

- hypothesis: The Task type stores level/depth/indent separate from parentId
  evidence: Checked types/index.ts — no such fields exist
  timestamp: 2026-03-15T00:00:00.000Z

- hypothesis: GanttChart.handleDelete is missing cascade logic entirely
  evidence: Lines 417-427 show it DOES collect descendants. The bug is that only taskId is passed to onDelete, not the full set.
  timestamp: 2026-03-15T00:00:00.000Z

## Resolution

root_cause: |
  PART 1 (cascade delete):
  GanttChart.handleDelete collects all descendants to delete via collectDescendants(),
  but only calls onDelete(taskId) — passing only the original task's ID.
  The consumer's onDelete handler (page.tsx) filters only that single ID.
  Children remain because the consumer is never told to remove them.

  Fix options:
  A) Change GanttChart.handleDelete to call onDelete for each task in toDelete set
  B) Change onDelete API to accept Set<string> or string[]
  C) Handle deletion entirely inside GanttChart (don't use external onDelete for cascade)

  Best approach: GanttChart should handle the cascade internally and call onDelete once
  with an array of IDs (or change the contract). Since changing the API signature is a
  breaking change, the cleanest fix is to call onDelete for each descendant too — or
  to filter tasks via onTasksChange with the remaining tasks (non-deleted).

  Actually, the simplest non-breaking fix: in GanttChart.handleDelete, after building
  toDelete set, emit onTasksChange with all non-deleted tasks (or just the cleaned-up
  tasks), AND call onDelete for each task in toDelete (including descendants).

  But onDelete is a consumer callback for side effects (e.g., backend calls).
  Calling it N times for cascade is semantically wrong.

  Best design: Add a new callback onDeleteCascade(taskIds: string[]) OR change
  onDelete to accept string[] — but that's a breaking change.

  Simplest fix that works without API change: The page.tsx handleDelete should
  cascade by looking up children. But the consumer shouldn't need to know about
  hierarchy internals.

  ACTUAL BEST FIX: GanttChart handles cascade entirely. It removes all orphaned
  children from the internal state and emits onTasksChange with ONLY the remaining
  non-deleted tasks. Then calls onDelete(taskId) for the primary task only.

  But GanttChart doesn't own the tasks state — consumer does.

  The cleanest fix without API changes: change GanttChart.handleDelete to call
  onDelete for each ID in the toDelete set (all descendants + original).
  Consumer's simple filter(t => t.id !== taskId) won't work for cascade,
  so we need to update page.tsx too.

  Final decision:
  - In GanttChart.handleDelete: call onDelete once with all IDs OR refactor to pass
    the full set. Since onDelete signature is (taskId: string), we keep it but
    also emit the full deletion via onTasksChange (passing the filtered remaining array).

  Simplest clean fix:
  In GanttChart.handleDelete, after building toDelete, emit ALL remaining tasks
  via a special onTasksChange call, then call onDelete(taskId) for the original.

  OR: update page.tsx handleDelete to cascade delete based on parentId chain.
  This keeps all logic in the consumer where state lives.

  Going with: fix BOTH sides:
  1. GanttChart.handleDelete: call onDelete for each descendant ID too (not just root)
  2. page.tsx handleDelete: keep simple filter (works since GanttChart now passes all IDs)

  ACTUALLY simplest: let GanttChart emit onTasksChange with remaining tasks (non-deleted),
  and call onDelete only once for the original. Consumer listens to onTasksChange
  and replaces their state. This is already how other operations work.

  FINAL DECISION:
  In GanttChart.handleDelete:
  - Build toDelete set (original + all descendants)  [ALREADY DONE]
  - Emit onTasksChange with cleaned-up remaining tasks (deps cleaned + filtered non-deleted)
  - Call onDelete(taskId) for the original task only (signal to consumer)
  page.tsx handleDelete: use setTasks(prev => prev.filter(t => !IDs.has(t.id)))
  But page.tsx doesn't have access to the toDelete set...

  TRULY FINAL DECISION:
  The cleanest approach: GanttChart.handleDelete should call onDelete for EACH task
  in the toDelete set. Consumer's handleDelete does filter by that single ID each time.
  This calls the handler multiple times but works with the existing API.

  OR even simpler: page.tsx handleDelete looks up children itself and filters all.
  But that duplicates hierarchy logic.

  SIMPLEST CORRECT FIX:
  Modify GanttChart.handleDelete to emit ALL remaining tasks via onTasksChange
  (both dependency-cleaned tasks AND removal of deleted tasks), so the consumer
  gets a complete picture of what remains. Then onDelete is just a notification.
  In page.tsx, make handleDelete filter all IDs in the cascade.

  The real problem: onDelete passes only one string. We need to either:
  (a) Change GanttChart to call onDelete multiple times (one per deleted task)
  (b) Change page.tsx to query children on delete
  (c) Change API to onDelete(taskIds: string[])

  Option (a) is the least invasive. Going with (a).

  PART 2 (collapse visibility - multi-level):
  Both filteredTasks (GanttChart) and visibleTasks (TaskList) only check
  direct parent: collapsedParentIds.has(task.parentId).
  For grandchildren, this check fails if only the grandparent is collapsed
  (grandparent is in collapsedParentIds, but grandchild's parentId is the
  intermediate parent, which is NOT in collapsedParentIds).
  Fix: check if ANY ancestor is in collapsedParentIds.
  This requires building a parentId map and walking up the chain.

fix: |
  PART 1: In GanttChart.handleDelete, call onDelete for each ID in toDelete set
  (original + all descendants), not just the original.

  PART 2: Replace single-level parent check with ancestor chain check in:
  - GanttChart.tsx filteredTasks useMemo
  - TaskList.tsx visibleTasks useMemo

  Create a helper function: isAnyAncestorCollapsed(task, allTasks, collapsedParentIds)
  that walks up the parentId chain until it finds a collapsed ancestor or reaches root.

verification: |
  - Build succeeds (tsup, DTS)
  - 12 new regression tests pass
  - 230 previously passing tests still pass
  - 4 pre-existing unrelated dateUtils failures unchanged
files_changed:
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/__tests__/cascadeDeleteAndMultiLevelCollapse.test.ts
