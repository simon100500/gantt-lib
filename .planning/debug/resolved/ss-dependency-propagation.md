---
status: resolved
trigger: "SS dependency doesn't propagate when predecessor task moves due to FS chain (A --FS--> B --SS--> C)"
created: 2026-02-22T00:00:00.000Z
updated: 2026-02-22T04:00:00.000Z
---

## Current Focus
hypothesis: FIX VERIFIED - All tests pass including new tests for mixed link type cascading.
test: Created 2 new test cases: 1) completion cascade for mixed FS->SS chain, 2) preview cascade during drag
expecting: Both tests verify that task-3 (SS on B) correctly cascades when task-1 (A) is resized right
next_action: Commit the fix

## Symptoms
expected: When A's right edge is dragged → B moves (via FS) → C should also move (via SS dependency to B) - cascading propagation
actual: B moves correctly but C stays in place - SS dependency is not triggering when B moves due to A's resize
errors: No error messages reported
reproduction: |
  1. Create three tasks: A, B, C
  2. Link A --FS--> B (Finish-to-Start)
  3. Link B --SS--> C (Start-to-Start)
  4. Drag the right edge of task A to resize it
  5. Observe: B's start moves correctly, but C doesn't move at all
started: Always reproducible, not a regression - this appears to be a missing feature

## Eliminated

## Evidence
- timestamp: 2026-02-22T02:00:00.000Z
  checked: useTaskDrag.ts handleComplete function (lines 587-591)
  found: For resize-right: `getSuccessorChain(taskId, allTasks, ['FS'])` - only follows FS edges
  implication: In chain A--FS-->B--SS-->C, this finds B but not C (because B--SS-->C is not an FS edge)

- timestamp: 2026-02-22T02:00:00.000Z
  checked: getSuccessorChain function BFS logic (lines 179-192)
  found: The function DOES traverse recursively (BFS), but filters by linkTypes parameter. When linkTypes=['FS'], it only follows FS edges at each level.
  implication: For mixed link type chains, the traversal stops when the link type doesn't match.

- timestamp: 2026-02-22T03:00:00.000Z
  checked: Implemented fix - added getTransitiveCascadeChain() helper function
  found: The function builds transitive closure by: 1) getting direct successors filtered by firstLevelLinkTypes, 2) then BFS to find ALL successors (any type) of those tasks
  implication: This correctly handles mixed link type chains while preserving the semantic behavior (e.g., resize-right doesn't move direct SS successors of the dragged task)

- timestamp: 2026-02-22T03:00:00.000Z
  checked: Updated handleMouseDown and handleComplete to use getTransitiveCascadeChain()
  found: Both preview cascade (live drag) and completion cascade now use the transitive closure logic
  implication: The fix applies to both the real-time preview and the final cascade on completion

- timestamp: 2026-02-22T03:00:00.000Z
  checked: All existing tests pass (32 dependencyUtils tests, 29 useTaskDrag tests)
  found: No regressions from the fix
  implication: The fix is backward compatible with existing behavior

- timestamp: 2026-02-22T04:00:00.000Z
  checked: Added 2 new test cases for mixed link type cascading
  found: Tests verify A--FS-->B--SS-->C cascades correctly when A is resized right
  implication: The fix is verified and working as expected

## Resolution
root_cause: handleComplete filters successor chain by link type (['FS'] for resize-right, ['SS'] for resize-left). This breaks mixed dependency chains like A--FS-->B--SS-->C where B is found (FS edge matches) but C is missed (SS edge doesn't match FS filter) when traversing transitive successors.

fix: Created getTransitiveCascadeChain() helper function that builds proper transitive closure: direct successors filtered by first-level link types (FS for resize-right, SS for resize-left) + ALL successors (any type) of those tasks recursively. This preserves semantic correctness (e.g., resize-right doesn't move direct SS successors of dragged task) while enabling mixed link type chains to cascade properly.

verification: All 33 useTaskDrag tests pass (including 2 new tests for mixed FS->SS cascading). 32 dependencyUtils tests also pass. The fix correctly cascades A--FS-->B--SS-->C when A is resized right, with both B and C shifting by the correct delta.

files_changed: [
  'packages/gantt-lib/src/hooks/useTaskDrag.ts',
  'packages/gantt-lib/src/__tests__/useTaskDrag.test.ts'
]
