---
status: awaiting_human_verify
trigger: "SF child task cannot be dragged left past project start. Parent can push child past project start fine."
created: 2026-02-27T00:00:00Z
updated: 2026-02-27T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED. `minAllowedLeft` was initialized to `0`, causing the clamp to enforce a project-start floor even when no FS/SS constraint applies.
test: One-character change: `let minAllowedLeft = -Infinity` removes the implicit floor when there are no FS/SS predecessors.
expecting: Child with only SF dep can now freely drag left past pixel 0 (project start). FS/SS constraints still work — they set minAllowedLeft to a real positive value.
next_action: Human verification — drag child left in browser

## Symptoms

expected: Child task with SF dependency (positive lag) should be draggable to the left, including past the project's first task start date
actual: Child task is completely blocked from moving left. It does not move at all when dragged left.
errors: No runtime errors — task just does not respond to leftward drag
reproduction: Have two tasks with SF dependency. Child has positive lag. Try to drag child task to the left. It won't move. But dragging parent to the left will push child along just fine.
timeline: Appeared recently, likely after a fix for SF lag -1 issue
key_hint: Issue is specifically related to the project start boundary. Child task cannot be dragged left past (or to) the project start. Parent can push child past project start successfully.

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-02-27T00:00:00Z
  checked: useTaskDrag.ts lines 298-327 (FS/SS constraint block)
  found: minAllowedLeft initialized to 0. Loop skips all non-FS/non-SS deps. For SF-only child, loop does nothing. Clamp on line 320 enforces `newLeft = Math.max(0, newLeft)`. This means any task — SF child or not — cannot have newLeft < 0.
  implication: This is the "project start" lock. The child starts at pixel 0 or slightly above, and cannot go below 0. For an SF child that is correctly positioned at the start of the chart, this locks it in place.

- timestamp: 2026-02-27T00:00:00Z
  checked: useTaskDrag.ts lines 329-364 (SF constraint block)
  found: This block fires for mode === 'move' || mode === 'resize-right'. When mode === 'move' and user drags left, proposedEndRight = newLeft + initialWidth. If proposedEndRight > sfBoundaryRight, it clamps newLeft to sfBoundaryRight - initialWidth. BUT sfBoundaryRight = predStartLeft (predecessor's start in pixels). If predStartLeft is small (near 0), this clamp can also restrict leftward movement.
  implication: Two separate constraints can independently block leftward drag. The primary one for the reported bug is minAllowedLeft=0 from the FS/SS block.

- timestamp: 2026-02-27T00:00:00Z
  checked: parent-push cascade path lines 392-456
  found: No minAllowedLeft clamp. Cascade freely shifts child left including past pixel 0 (negative left).
  implication: Confirms asymmetry: parent-push bypasses the constraint block entirely, which is why it works.

## Resolution

root_cause: In the FS/SS constraint block (lines 298-327), `minAllowedLeft` was initialized to `0` (hardcoded project-start floor). For a child with only SF dependency (no FS or SS), the loop body is skipped entirely (line 303: `if (dep.type !== 'FS' && dep.type !== 'SS') continue`), leaving minAllowedLeft = 0. The clamp `newLeft = Math.max(0, newLeft)` then prevented the child from moving to negative pixel values (before monthStart). The child was stuck at pixel 0. Parent-push bypassed this entirely — it goes through the cascade path (lines 392-456) which has no such floor.
fix: Changed `let minAllowedLeft = 0;` to `let minAllowedLeft = -Infinity;` at line 301. When no FS/SS predecessors are found, the clamp `Math.max(-Infinity, newLeft)` is a no-op. FS/SS constraints still work correctly — they set minAllowedLeft to predStartLeft, which is a real positive value.
verification: pending human confirmation
files_changed:
  - packages/gantt-lib/src/hooks/useTaskDrag.ts (line 301: minAllowedLeft init 0 -> -Infinity)
