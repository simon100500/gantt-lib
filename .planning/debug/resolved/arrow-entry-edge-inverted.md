---
status: resolved
trigger: "arrow-entry-edge-inverted — Dependency arrows arrive at wrong edges of task bars"
created: 2026-02-22T00:00:00Z
updated: 2026-02-22T00:00:00Z
---

## Current Focus

hypothesis: The toY for the target task uses the wrong edge property. entryY/exitY are named from the downward-arrow perspective, and the reverse-order branch correctly uses predecessor.entryY (top) for the upward exit, but then incorrectly uses successor.entryY (top) for the entry of an upward arrow — it should be successor.exitY (bottom). Similarly, normal order uses successor.exitY (bottom) when it should use successor.entryY (top).
test: Read actual coordinates produced by each case and compare to desired visual outcome
expecting: Swapping toY property (entryY <-> exitY for the successor) fixes entry edge for both directions
next_action: DONE — fix applied, verified by coordinate analysis

## Symptoms

expected:
- Upward arrow (reverse order: predecessorIndex > successorIndex) → exits from TOP of source bar, arrives at TOP of target bar
- Downward arrow (normal order: predecessorIndex < successorIndex) → exits from BOTTOM of source bar, arrives at BOTTOM of target bar

actual:
- Arrows from top arrive at BOTTOM edge of bar
- Arrows from bottom arrive at TOP edge of bar
(entry edges are inverted relative to direction)

errors: none — visual only

reproduction: Open dev server on worktree branch, scroll to Task Dependencies section, observe arrow endpoints

started: Introduced in quick-14 implementation (commit 58f3564 on branch worktree-workterr)

## Eliminated

- hypothesis: calculateOrthogonalPath is building the path incorrectly
  evidence: Path function is straightforward — H then diagonal chamfer then V to toY. The bug is in the input coordinates.
  timestamp: 2026-02-22T00:00:00Z

## Evidence

- timestamp: 2026-02-22T00:00:00Z
  checked: taskPositions map definition in DependencyLines.tsx on depend branch
  found: exitY = rowTop + rowHeight - 10 (BOTTOM edge), entryY = rowTop + 4 (TOP edge). Names reflect default downward-arrow semantics.
  implication: entryY is the TOP of bar, exitY is the BOTTOM of bar.

- timestamp: 2026-02-22T00:00:00Z
  checked: Bidirectional logic in depend branch (commit 58f3564)
  found: Normal order: fromY = predecessor.exitY (bottom ✓), toY = successor.exitY (bottom = WRONG, should be top/entryY). Reverse order: fromY = predecessor.entryY (top ✓), toY = successor.entryY (top = WRONG, should be bottom/exitY).
  implication: The toY for the successor uses the wrong property in both cases — it should be the OPPOSITE of what fromY uses for the predecessor.

- timestamp: 2026-02-22T00:00:00Z
  checked: calculateOrthogonalPath path shape
  found: Arrow travels horizontally then turns and arrives vertically at (to.x, to.y). The vertical arrival means toY must be the NEAR edge (the edge the arrow physically touches first when approaching).
  implication: For downward arrow: toY must be TOP of successor (entryY). For upward arrow: toY must be BOTTOM of successor (exitY).

## Resolution

root_cause: In the bidirectional edge calculation, the successor's toY uses the same-named property as the predecessor's fromY (both entryY for reverse, both exitY for normal). But the correct pairing is opposite: for downward arrows, fromY = exitY (bottom) and toY = entryY (top of successor). For upward arrows, fromY = entryY (top) and toY = exitY (bottom of successor).

fix: In the reverse-order branch, change toY = successor.entryY → toY = successor.exitY. In the normal-order branch, change toY = successor.exitY → toY = successor.entryY.

verification: Verified by coordinate analysis. Normal order (row 0→1, rowHeight=40): fromY=30 (bottom row0), toY=44 (top row1), path arrives vertically going DOWN at top of successor ✓. Reverse order (row 1→0): fromY=44 (top row1), toY=30 (bottom row0), path arrives vertically going UP at bottom of successor ✓. calculateOrthogonalPath confirms goingDown flag matches direction in both cases.
files_changed:
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx (on worktree-workterr branch)
