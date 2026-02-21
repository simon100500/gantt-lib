---
phase: quick-11
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/utils/geometry.ts
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
autonomous: true
requirements: [QUICK-11]

must_haves:
  truths:
    - "Dependency arrows are small and proportional to the line stroke (visually ~6-8px)"
    - "Lines emerge from the right edge of the predecessor task bar, not from the middle"
    - "Lines arrive at the left edge of the successor task bar"
    - "When successor is to the right: line goes right → vertical → right arriving at left edge"
    - "When successor is to the left or overlapping: line detours right, down/up, left, then arrives"
  artifacts:
    - path: "packages/gantt-lib/src/utils/geometry.ts"
      provides: "calculateOrthogonalPath — corrected path geometry"
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx"
      provides: "SVG marker with correct arrowhead sizing"
  key_links:
    - from: "DependencyLines.tsx marker"
      to: "SVG path endpoint"
      via: "markerEnd url reference"
      pattern: "markerEnd.*arrowhead"
---

<objective>
Fix DependencyLines component: arrowheads are far too large, and dependency lines start from the wrong position (shifted away from the right edge of the task bar due to incorrect adaptation of frappe/gantt's path logic).

Purpose: Dependency lines must look clean and professional — thin lines with small arrows emerging precisely from the right edge of predecessor bars and arriving at the left edge of successor bars.
Output: Corrected geometry.ts calculateOrthogonalPath function and fixed SVG marker sizing in DependencyLines.tsx.
</objective>

<execution_context>
@D:/Projects/gantt-lib/.planning/quick/11-fix-dependencylines-component-huge-arrow/11-PLAN.md
</execution_context>

<context>
@D:/Projects/gantt-lib/.planning/STATE.md
@D:/Projects/gantt-lib/packages/gantt-lib/src/utils/geometry.ts
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix arrowhead marker size in DependencyLines.tsx</name>
  <files>packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx</files>
  <action>
The current marker definition uses default `markerUnits="strokeWidth"` with `markerWidth="10" markerHeight="7"`. This means the rendered arrowhead is 10 × stroke-width = 20px wide — far too large.

Fix: add `markerUnits="userSpaceOnUse"` and reduce to pixel dimensions that look proportional to a 2px stroke. Target arrowhead: 8px wide, 6px tall.

Change both `<marker>` elements (arrowhead and arrowhead-cycle) as follows:

```tsx
<marker
  id="arrowhead"
  markerWidth="8"
  markerHeight="6"
  markerUnits="userSpaceOnUse"
  refX="7"
  refY="3"
  orient="auto"
>
  <polygon
    points="0 0, 8 3, 0 6"
    fill="var(--gantt-dependency-line-color, #666666)"
  />
</marker>

<marker
  id="arrowhead-cycle"
  markerWidth="8"
  markerHeight="6"
  markerUnits="userSpaceOnUse"
  refX="7"
  refY="3"
  orient="auto"
>
  <polygon
    points="0 0, 8 3, 0 6"
    fill="var(--gantt-dependency-cycle-color, #ef4444)"
  />
</marker>
```

Note: CSS classes on `<marker>` elements do not reliably cascade to `<polygon>` children in all browsers. Use inline `fill` attribute directly on the `<polygon>` elements (as shown above). Remove the `className` props from the `<marker>` elements. The CSS `.gantt-dependency-arrow polygon` rule can remain for overrides but inline fill is the reliable baseline.

Also: the path endpoint must align with the arrowhead tip. Since `refX="7"` means the marker's reference point is 1px before the tip (tip is at x=8), the path ends exactly where the arrowhead tip begins. This is correct — SVG draws the marker AT the endpoint, and `refX` shifts it back so the tip lands precisely on the coordinate.
  </action>
  <verify>Inspect the SVG in browser DevTools — marker polygon should be ~8px wide. No enormous triangle arrowheads visible.</verify>
  <done>Arrowheads are small and proportional, matching visual style of professional Gantt tools (approximately 6-8px). Both normal and cycle arrow colors are correct.</done>
</task>

<task type="auto">
  <name>Task 2: Rewrite calculateOrthogonalPath with correct geometry</name>
  <files>packages/gantt-lib/src/utils/geometry.ts</files>
  <action>
The current `calculateOrthogonalPath` was adapted from frappe/gantt's `arrow.js` but incorrectly — frappe starts from the bar's midpoint and adjusts leftward to find a clean exit. We already pass the right edge as `from.x`, so the nudging loop `while (toX < startX + padding ...) { startX -= 10 }` followed by `startX -= 10` moves the start point incorrectly to the LEFT of the right edge.

Replace the entire `calculateOrthogonalPath` function body with a clean implementation:

**Rules for the new path:**
- Start exactly at `(from.x, from.y)` — right edge of predecessor, vertical center
- End exactly at `(to.x, to.y)` — left edge of successor, vertical center
- Use rounded corners with radius `curve` (default 6px — smaller than current 12px for cleaner look)
- Minimum horizontal extension before turning: `padding` (default 14px)

**Two cases:**

**Case A — Successor is clearly to the right** (to.x >= from.x + padding * 2):
Simple L-shape with one vertical jog:
```
from.x → midX (horizontal right)
midX → to.y (vertical, with rounded corner)
midX → to.x (horizontal right, with rounded corner)
```
Where midX = from.x + (to.x - from.x) / 2

Path:
```
M fromX fromY
H (midX - curve)
a curve curve 0 0 [cw] curve [curveY]
V (toY - curveY)      ← adjust by curve toward toY
a curve curve 0 0 [cw] curve [curveY]   ← turn to go horizontal
... but this overshoots
```

Actually use the simpler correct formulation:

```
M fromX fromY
H (midX - curve)                          ← horizontal to before turn
a curve curve 0 0 [turn1] curve [±curve]  ← arc to vertical
V (toY ∓ curve)                            ← vertical to before turn
a curve curve 0 0 [turn2] curve [±curve]  ← arc to horizontal
H toX                                      ← horizontal to destination
```

Where `turn1` and `turn2` arcs depend on whether `toY > fromY` (going down) or `toY < fromY` (going up).

**Case B — Successor is to the left or close** (to.x < from.x + padding * 2):
The line must detour right, then travel past both tasks vertically, then come back left:
```
from.x → (from.x + padding) horizontal extension right
detour right, vertical travel past row boundary, horizontal left, arrive at left of successor
```

Path (detour right then wrap around):
```
M fromX fromY
H (fromX + padding - curve)
a curve curve 0 0 [cw1] curve [±curve]
V (midY ∓ curve)                         ← midY is halfway between fromY and toY (or next row edge)
a curve curve 0 0 [cw2] (-curve) [±curve]
H (toX - padding + curve)               ← left of target minus padding
a curve curve 0 0 [cw3] (-curve) [±curve]
V (toY ∓ curve)
a curve curve 0 0 [cw4] curve [±curve]
H toX
```

For implementation simplicity, use the detour via the row boundary:

```typescript
export const calculateOrthogonalPath = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  curve: number = 6,
  padding: number = 14
): string => {
  const fx = Math.round(from.x);
  const fy = Math.round(from.y);
  const tx = Math.round(to.x);
  const ty = Math.round(to.y);

  const goingDown = ty >= fy;
  const dirY = goingDown ? 1 : -1;    // +1 down, -1 up
  const cw = goingDown ? 0 : 1;       // arc sweep for going down vs up

  // Case A: successor is far enough to the right for a simple S-curve
  if (tx >= fx + padding * 2) {
    const midX = Math.round(fx + (tx - fx) / 2);

    if (fy === ty) {
      // Same row: straight horizontal line
      return `M ${fx} ${fy} H ${tx}`;
    }

    // S-curve: right → vertical → right
    return [
      `M ${fx} ${fy}`,
      `H ${midX - curve}`,
      `a ${curve} ${curve} 0 0 ${goingDown ? 1 : 0} ${curve} ${dirY * curve}`,
      `V ${ty - dirY * curve}`,
      `a ${curve} ${curve} 0 0 ${goingDown ? 0 : 1} ${curve} ${dirY * curve}`,
      `H ${tx}`,
    ].join(' ');
  }

  // Case B: successor is to the left or overlapping — detour right then wrap
  const detourX = fx + padding;
  const detourLeft = tx - padding;

  if (fy === ty) {
    // Same row, going backward: up and around
    const loopY = fy - 20; // Loop above both tasks
    return [
      `M ${fx} ${fy}`,
      `H ${detourX - curve}`,
      `a ${curve} ${curve} 0 0 0 ${curve} ${-curve}`,
      `V ${loopY + curve}`,
      `a ${curve} ${curve} 0 0 0 ${-curve} ${-curve}`,
      `H ${detourLeft + curve}`,
      `a ${curve} ${curve} 0 0 0 ${-curve} ${curve}`,
      `V ${ty - curve}`,
      `a ${curve} ${curve} 0 0 0 ${curve} ${curve}`,
      `H ${tx}`,
    ].join(' ');
  }

  // Different rows, going backward or overlapping
  const midY = Math.round(fy + (ty - fy) / 2);

  return [
    `M ${fx} ${fy}`,
    `H ${detourX - curve}`,
    `a ${curve} ${curve} 0 0 ${goingDown ? 1 : 0} ${curve} ${dirY * curve}`,
    `V ${midY - dirY * curve}`,
    `a ${curve} ${curve} 0 0 ${goingDown ? 0 : 1} ${-curve} ${dirY * curve}`,
    `H ${detourLeft + curve}`,
    `a ${curve} ${curve} 0 0 ${goingDown ? 1 : 0} ${-curve} ${dirY * curve}`,
    `V ${ty - dirY * curve}`,
    `a ${curve} ${curve} 0 0 ${goingDown ? 0 : 1} ${curve} ${dirY * curve}`,
    `H ${tx}`,
  ].join(' ');
};
```

Keep the old `calculateBezierPath` function (it may be used elsewhere). Only replace `calculateOrthogonalPath`.

Also update the call site in `DependencyLines.tsx` to use smaller defaults:
```tsx
const path = calculateOrthogonalPath(from, to, 6, 14);
```
  </action>
  <verify>
1. Open the demo app (`npm run dev` in apps/website or equivalent).
2. Observe tasks with dependencies: lines should emerge from the right edge of each predecessor bar.
3. Lines should arrive at the left edge of each successor bar.
4. For tasks in sequence (A → B → C), each line starts at right edge and ends at left edge cleanly.
5. For backward dependencies (successor is to the left), lines should loop around cleanly.
6. Run `npm run build` in packages/gantt-lib — no TypeScript errors.
  </verify>
  <done>
Lines start exactly at the right edge of predecessor task bars (not from the middle or shifted position). Lines end exactly at the left edge of successor bars. Rounded corners are present. Same-row backward connections loop cleanly. TypeScript compiles without errors.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Fixed DependencyLines component:
    - Arrowheads: changed to markerUnits="userSpaceOnUse" with 8x6px size (was incorrectly scaled to 20px+)
    - Geometry: rewrote calculateOrthogonalPath so lines start at right edge of predecessor bars (not shifted leftward)
    - Path logic: clean two-case implementation (simple S-curve when successor is to the right, detour loop when to the left)
  </what-built>
  <how-to-verify>
    1. Start the dev server and open the Gantt chart with tasks that have dependencies.
    2. Verify arrowheads: should be small (approximately 6-8px), not large triangles.
    3. Verify line start points: lines must emerge from the RIGHT EDGE of each task bar, not from the middle.
    4. Verify line end points: lines must arrive at the LEFT EDGE of each successor task bar.
    5. Verify for different layouts: successor to the right (S-curve), successor to the left (detour loop).
    6. Check cycle dependencies: red color and arrow should display correctly.
  </how-to-verify>
  <resume-signal>Type "approved" if the dependency lines look correct, or describe what still looks wrong.</resume-signal>
</task>

</tasks>

<verification>
- No TypeScript compilation errors (`npm run build` in packages/gantt-lib passes)
- Arrowheads are proportional to stroke width (~6-8px)
- Lines start at right edge of predecessor bars
- Lines end at left edge of successor bars
- Both normal and cycle marker colors display correctly
</verification>

<success_criteria>
Dependency lines look professional: thin lines with small arrowheads, precise geometry from bar end to bar start, clean rounded corners on path jogs.
</success_criteria>

<output>
After completion, create `.planning/quick/11-fix-dependencylines-component-huge-arrow/11-SUMMARY.md` with what was changed and any issues encountered.
</output>
