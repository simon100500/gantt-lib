---
status: resolved
trigger: "FF and SF dependency line chamfers (orthogonal path corners) are mirrored — their bevel direction is inverted compared to what's geometrically correct."
created: 2026-02-22T00:00:00Z
updated: 2026-02-22T00:05:00Z
---

## Current Focus

hypothesis: VERIFIED - `tx + dirX * C` in arrivesFromRight=true branch was the sign error causing mirrored chamfer
test: fix applied (changed + to -), all geometry/dependency tests pass (56/56)
expecting: FF/SF chamfer bevels now match natural inside-corner direction, same as FS/SS
next_action: COMPLETE

## Symptoms

expected: FF and SF dependency lines connect right->right and left->right respectively, with chamfers that curve naturally toward the destination edge
actual: FF and SF chamfer corners are mirrored — the bevel bends in the wrong direction (as if the path is going the opposite way)
errors: none (visual bug only)
reproduction: render any FF or SF dependency link in the Gantt chart and observe the path shape
started: introduced in quick-17 (commit 133d8cc) which added calculateDependencyPath to geometry.ts

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-02-22T00:01:00Z
  checked: geometry.ts calculateDependencyPath, arrivesFromRight=true branch (FF/SF)
  found: |
    arrivesFromRight=true branch uses `H ${tx + dirX * C}` then `L ${tx} ${fy + dirY * C}`.
    dirX = goingRight ? 1 : -1, where goingRight = (tx >= fx).

    FF example: predecessor.right → successor.right. If successor is to the RIGHT (tx > fx):
      goingRight=true, dirX=+1
      H to (tx + 1*C) = tx+C  →  overshoots past tx to the RIGHT
      L to (tx, fy+C)          →  comes back LEFT to tx, then bends down/up
    This means the chamfer bevel cuts from (tx+C, fy) to (tx, fy+C) — bevel opens to the RIGHT.

    arrivesFromRight=false branch (FS/SS) uses `H ${tx - dirX * C}`:
    FS example: predecessor.right → successor.left. If successor is to the RIGHT (tx > fx):
      goingRight=true, dirX=+1
      H to (tx - 1*C) = tx-C  →  stops SHORT of tx on the LEFT
      L to (tx, fy+C)          →  continues RIGHT to tx, then bends down/up
    Chamfer bevel cuts from (tx-C, fy) to (tx, fy+C) — bevel opens to the LEFT.

    The two branches are SYMMETRIC mirror images of each other (tx+C vs tx-C).
    The FS path makes geometric sense: travel right, stop C before destination, chamfer corner.
    The FF path (arrivesFromRight=true): the path OVERSHOOTS tx then comes back — the chamfer
    bevel points the wrong way. The correct behavior for arriving at the right edge from the right
    (i.e. the arrow comes in from further right) would be to UNDERSHOOT (stop C to the right of tx)
    and then bend.
  implication: |
    For FF/SF the arrow arrives at the RIGHT edge moving leftward (from right-of-tx toward tx).
    The correct chamfer must OVERSHOOT tx by going further left (tx - C when going left),
    not further right. The current code uses tx + dirX*C which moves the horizontal leg
    PAST tx in the direction of travel, rather than stopping C short of tx from the correct side.

## Resolution

root_cause: |
  In calculateDependencyPath (geometry.ts), the arrivesFromRight=true branch (FF/SF)
  used `H ${tx + dirX * C}` — this OVERSHOOTS past tx in the direction of travel, then the
  diagonal L segment must come BACK in the opposite direction to reach tx, inverting the chamfer
  bevel direction. The correct formula is `tx - dirX * C` (stop C short of tx in the direction
  of travel), which produces a natural inside-corner chamfer identical in shape to the FS/SS branch.
  The bug was introduced in the arrivesFromRight=true branch when it was written as the "mirror" of
  the arrivesFromRight=false branch, incorrectly flipping the sign of the horizontal overshoot.
fix: |
  Changed `H ${tx + dirX * C}` to `H ${tx - dirX * C}` in the arrivesFromRight=true branch
  of calculateDependencyPath in geometry.ts. Both branches now use the identical chamfer formula.
  Also cleaned up the misleading comment block that described the old wrong behavior.
verification: All 56 geometry and dependency tests pass. Pre-existing useTaskDrag DOM failures are unrelated.
files_changed:
  - packages/gantt-lib/src/utils/geometry.ts
