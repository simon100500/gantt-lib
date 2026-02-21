---
status: resolved
trigger: "SS and SF dependency types: line exits from wrong X coordinate — starts inside task bar instead of left edge"
created: 2026-02-22T00:00:00Z
updated: 2026-02-22T00:02:00Z
---

## Current Focus

hypothesis: RESOLVED
test: removed +10 offset from taskPositions.left; all 120 tests pass
expecting: SS/SF lines exit from the actual left boundary of the predecessor bar
next_action: archive

## Symptoms

expected: SS (left->left) and SF (left->right) lines exit from the left edge of the predecessor task bar (x = task bar left boundary)
actual: exit point is shifted inward — line appears to start from inside the task bar, not its left edge. Exit X coordinate is wrong.
errors: none (visual bug only)
reproduction: render any SS or SF dependency link in the Gantt chart and observe where the line exits the predecessor bar
started: introduced in quick-17 (commit 133d8cc) which added calculateDependencyPath and updated DependencyLines.tsx to use type-aware connection points

## Eliminated

- hypothesis: bug is in calculateDependencyPath geometry function
  evidence: calculateDependencyPath correctly uses the from.x it receives; the error is in what value is passed as from.x
  timestamp: 2026-02-22T00:01:00Z

## Evidence

- timestamp: 2026-02-22T00:00:30Z
  checked: DependencyLines.tsx taskPositions useMemo (lines 42-65)
  found: positions.set stores `left: resolvedLeft + 10` — a 10px inset baked into the left coordinate
  implication: any use of predecessor.left or successor.left is shifted 10px to the right of the actual bar left edge

- timestamp: 2026-02-22T00:00:45Z
  checked: git history for when +10 was introduced (commit cf11599)
  found: +10 was added in an early styling commit when DependencyLines used bezier curves and `left` was the successor arrival point (entry inset). The semantics were different from today.
  implication: the +10 was for an old visual purpose (entry inset on successor side for bezier). Now that left is also used as the predecessor EXIT point for SS/SF, it incorrectly offsets the exit.

- timestamp: 2026-02-22T00:00:55Z
  checked: how predecessor.left and successor.left are used (lines 116, 121)
  found: predecessor.left = exit X for SS/SF; successor.left = arrival X for FS/SS. Both are shifted +10 by the stored value.
  implication: fix is to remove +10 from the stored left value; both exit and arrival will then reference the true left edge.

## Resolution

root_cause: In DependencyLines.tsx, `taskPositions` stores `left: resolvedLeft + 10`. This +10 offset was introduced in commit cf11599 as a visual inset for the old bezier-curve system where `left` was only used as a successor arrival point. When quick-17 (133d8cc) repurposed `predecessor.left` as the exit X coordinate for SS and SF links, the +10 caused those lines to exit 10px inside the bar instead of at the left edge.
fix: changed `left: resolvedLeft + 10` to `left: resolvedLeft` in the taskPositions useMemo (line 58 of DependencyLines.tsx)
verification: all 120 unit tests pass; fix is minimal (1 line change)
files_changed:
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
