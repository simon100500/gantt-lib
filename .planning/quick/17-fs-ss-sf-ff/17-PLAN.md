---
phase: quick-17
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
  - packages/gantt-lib/src/utils/geometry.ts
autonomous: true
requirements: [QUICK-17]

must_haves:
  truths:
    - "SS lines connect left edge of predecessor to left edge of successor"
    - "FF lines connect right edge of predecessor to right edge of successor"
    - "SF lines connect left edge of predecessor to right edge of successor"
    - "FS lines continue to work exactly as before (right → left)"
    - "Arrowhead always points into the target connection edge correctly"
  artifacts:
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx"
      provides: "Updated line rendering using type-aware connection points"
    - path: "packages/gantt-lib/src/utils/geometry.ts"
      provides: "Path calculators for all 4 link types"
  key_links:
    - from: "DependencyLines.tsx"
      to: "geometry.ts"
      via: "calculateOrthogonalPath variants per edge.type"
      pattern: "edge\\.type"
---

<objective>
Add visual rendering of SS, FF, and SF dependency link types in the DependencyLines SVG component. Currently only FS (Finish-to-Start) lines are rendered correctly — all types call the same path function with the same connection points (predecessor.right → successor.left), which is wrong for the other three types.

Purpose: The SVG dependency overlay must accurately reflect link semantics by connecting from the correct edge on the predecessor to the correct edge on the successor, with the arrowhead pointing into the target.

Output: Updated DependencyLines.tsx and geometry.ts with type-aware path routing for all 4 link types.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
@packages/gantt-lib/src/utils/geometry.ts
@packages/gantt-lib/src/utils/dependencyUtils.ts
@packages/gantt-lib/src/types/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add type-aware path helpers to geometry.ts</name>
  <files>packages/gantt-lib/src/utils/geometry.ts</files>
  <action>
Add a new exported function `calculateDependencyPath` that replaces the direct use of `calculateOrthogonalPath` inside DependencyLines for all 4 link types. The function accepts `from`, `to`, and `direction` parameter indicating whether the arrow arrives from the left or from the right.

The existing `calculateOrthogonalPath` exits horizontally from `from.x`, chamfers at the turn, then arrives vertically at `to.x`. This works when arrival is from the LEFT (arrow pointing right into the left edge). For arrival from the RIGHT (FF, SF cases where the arrowhead must enter from right), the path logic must be mirrored: exit horizontally, bend, arrive vertically from the opposite side.

Add this function at the bottom of geometry.ts:

```typescript
/**
 * Calculate SVG path for dependency lines based on link type connection semantics.
 *
 * Connection points per link type:
 * - FS: predecessor RIGHT → successor LEFT  (arrow points right, enters left edge)
 * - SS: predecessor LEFT  → successor LEFT  (arrow points right, enters left edge)
 * - FF: predecessor RIGHT → successor RIGHT (arrow points left,  enters right edge)
 * - SF: predecessor LEFT  → successor RIGHT (arrow points left,  enters right edge)
 *
 * @param from - Start point {x, y}
 * @param to   - End point {x, y}
 * @param arrivesFromRight - true for FF and SF (arrow enters right edge of successor)
 */
export const calculateDependencyPath = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  arrivesFromRight: boolean
): string => {
  const fx = Math.round(from.x);
  const fy = Math.round(from.y);
  const tx = Math.round(to.x);
  const ty = Math.round(to.y);

  // Same row: straight horizontal line
  if (fy === ty) {
    return `M ${fx} ${fy} H ${tx}`;
  }

  const C = 2; // chamfer size
  const goingDown = ty > fy;
  const dirY = goingDown ? 1 : -1;

  if (arrivesFromRight) {
    // Arrow arrives at the RIGHT edge of successor (FF, SF).
    // Mirror of FS: exit horizontally from from.x, chamfer, arrive vertically at to.x
    // but now the horizontal move goes toward to.x from the same direction
    // Path: M fx fy → H (tx + C * dirX) → chamfer → V ty
    // Since arrow must POINT LEFT into the right edge we travel from fx toward tx.
    // If fx < tx (going right): overshoot past tx then come back is ugly.
    // Instead: the path is symmetric — exit H, bend, arrive V from above/below.
    const goingRight = tx >= fx;
    const dirX = goingRight ? 1 : -1;

    if (Math.abs(ty - fy) >= C && Math.abs(tx - fx) >= C) {
      return [
        `M ${fx} ${fy}`,
        `H ${tx + dirX * C}`,
        `L ${tx} ${fy + dirY * C}`,
        `V ${ty}`,
      ].join(' ');
    }
    return `M ${fx} ${fy} H ${tx} V ${ty}`;
  } else {
    // Arrow arrives at the LEFT edge of successor (FS, SS) — same as existing calculateOrthogonalPath
    const goingRight = tx >= fx;
    const dirX = goingRight ? 1 : -1;

    if (Math.abs(ty - fy) >= C && Math.abs(tx - fx) >= C) {
      return [
        `M ${fx} ${fy}`,
        `H ${tx - dirX * C}`,
        `L ${tx} ${fy + dirY * C}`,
        `V ${ty}`,
      ].join(' ');
    }
    return `M ${fx} ${fy} H ${tx} V ${ty}`;
  }
};
```

Note: The existing `calculateOrthogonalPath` function stays untouched (may be used elsewhere or in tests).
  </action>
  <verify>npx tsc --noEmit --project packages/gantt-lib/tsconfig.json 2>&1 | head -20</verify>
  <done>No TypeScript errors in geometry.ts, new `calculateDependencyPath` export is present.</done>
</task>

<task type="auto">
  <name>Task 2: Update DependencyLines to use type-aware connection points for all link types</name>
  <files>packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx</files>
  <action>
In `DependencyLines.tsx`, the positions map currently stores `left` and `right` x-coordinates. The rendering loop uses `predecessor.right` as from-X and `successor.left` as to-X for every edge type — this is only correct for FS.

Make the following changes:

1. Import `calculateDependencyPath` from geometry (add to the existing import line).

2. In the `taskPositions` useMemo, the positions map already stores `left` and `right` — no change needed there.

3. In the `lines` useMemo loop, replace the fixed connection point + `calculateOrthogonalPath` logic with type-aware selection:

```typescript
// Determine connection points based on link type:
// FS: right → left
// SS: left  → left
// FF: right → right
// SF: left  → right
const fromX = (edge.type === 'SS' || edge.type === 'SF')
  ? predecessor.left
  : predecessor.right;

const toX = (edge.type === 'FF' || edge.type === 'SF')
  ? successor.right
  : successor.left;

const arrivesFromRight = edge.type === 'FF' || edge.type === 'SF';

// Y coordinates: same up/down logic based on row order (keep existing reverseOrder logic)
// fromY and toY remain as they are now.

const from = { x: fromX, y: fromY };
const to = { x: toX, y: toY };

const path = calculateDependencyPath(from, to, arrivesFromRight);
```

Also update the SVG `<defs>` section: add two additional arrowhead markers for arrows pointing LEFT (used by FF and SF), since those lines arrive at right edges. The existing arrowhead points right (orient="auto" with polygon going left-to-right). For right-edge arrivals the arrowhead shape is the same but `orient="auto"` will handle direction automatically — no extra markers needed since orient="auto" rotates the marker to match path end direction. Verify this works by observing the rendered output.

4. In the `path` element rendering, include the edge type in the key to avoid stale keys:
```tsx
key={`${edge.predecessorId}-${edge.successorId}-${edge.type}`}
```

Replace the existing `from`/`to`/`path` calculation block (lines ~97-114 in the current file) with the above logic. Keep all other parts (reverseOrder, fromY/toY, hasCycle, etc.) unchanged.
  </action>
  <verify>npx tsc --noEmit --project packages/gantt-lib/tsconfig.json 2>&1 | head -30</verify>
  <done>TypeScript compiles clean. In the browser, SS/FF/SF dependency lines connect from the correct edges (left-left, right-right, left-right) with arrowheads pointing into the arrival edge.</done>
</task>

</tasks>

<verification>
After both tasks:
1. `npx tsc --noEmit --project packages/gantt-lib/tsconfig.json` — zero errors
2. `npm run build --workspace=packages/gantt-lib` — builds successfully
3. Open the demo app, add test dependencies of each type and observe:
   - SS: line exits left side of predecessor, arrives at left side of successor
   - FF: line exits right side of predecessor, arrives at right side of successor
   - SF: line exits left side of predecessor, arrives at right side of successor
   - FS: unchanged, exits right, arrives left
4. Existing FS demo links (Construction Project) still render correctly
</verification>

<success_criteria>
All 4 link types render lines from the semantically correct edge of the predecessor bar to the correct edge of the successor bar. The arrowhead (orient="auto") points into the arrival edge in all cases. No regressions on existing FS links.
</success_criteria>

<output>
After completion, create `.planning/quick/17-fs-ss-sf-ff/17-SUMMARY.md` with what was done, files changed, and any decisions made.
</output>