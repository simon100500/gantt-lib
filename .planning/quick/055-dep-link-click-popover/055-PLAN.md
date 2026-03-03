---
phase: quick-055
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.css
autonomous: true
requirements: [QUICK-055]
must_haves:
  truths:
    - "Clicking a dependency line on the Gantt chart opens a popover with a human-readable Russian description"
    - "Popover shows correct text for all 4 link types (FS, SS, FF, SF) with lag-aware wording"
    - "Popover closes on click outside or on second click on same line"
    - "Existing drag and task bar interactions are not broken by the click-area addition"
  artifacts:
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx"
      provides: "Clickable hit-area paths, popover state, description formatter"
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.css"
      provides: "Popover floating panel styles"
  key_links:
    - from: "SVG hit-area path onClick"
      to: "popover state (clickedEdge + popoverPos)"
      via: "mouse event clientX/clientY"
      pattern: "setClickedEdge.*setPopoverPos"
    - from: "formatDepDescription()"
      to: "Russian text output"
      via: "linkType + lag + predecessorName"
      pattern: "Через.*дн|Одновременно|За.*до"
---

<objective>
Add a click-to-popover feature on Gantt dependency lines that shows a human-readable Russian description of the dependency relationship.

Purpose: Users can click any dependency arrow on the chart to see a plain-language explanation like "Через 2 дня после окончания [Название задачи]" instead of cryptic FS+2 notation.
Output: Modified DependencyLines.tsx with invisible hit-area paths and a fixed-position popover div; updated CSS for the popover panel.
</objective>

<execution_context>
@D:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@D:/Projects/gantt-lib/.planning/STATE.md

Relevant source files:
- packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx — SVG overlay, currently pointer-events: none
- packages/gantt-lib/src/components/DependencyLines/DependencyLines.css — styles
- packages/gantt-lib/src/components/TaskList/DepIcons.tsx — LINK_TYPE_LABELS already defined (FS/SS/FF/SF Russian labels)
- packages/gantt-lib/src/types/index.ts — LinkType, Task, TaskDependency types

<interfaces>
From packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx:

Current DependencyLinesProps:
```typescript
export interface DependencyLinesProps {
  tasks: Task[];
  monthStart: Date;
  dayWidth: number;
  rowHeight: number;
  gridWidth: number;
  dragOverrides?: Map<string, { left: number; width: number }>;
  selectedDep?: { predecessorId: string; successorId: string; linkType: string } | null;
}
```

Current SVG has `pointer-events: none` via CSS class `gantt-dependencies-svg`.

Each rendered line has:
- `id`: `${predecessorId}-${successorId}-${type}`
- `path`: SVG path string
- `lag`: number (computed from pixel positions)
- The edge also knows `predecessorId`, `successorId`, `type` (from getAllDependencyEdges)

From packages/gantt-lib/src/components/TaskList/DepIcons.tsx:
```typescript
export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  FS: 'Окончание-начало',
  SS: 'Начало-начало',
  FF: 'Окончание-окончание',
  SF: 'Начало-окончание',
};
```

From packages/gantt-lib/src/utils/dependencyUtils.ts:
- getAllDependencyEdges(tasks) returns edges with { predecessorId, successorId, type, lag? }
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add clickable hit-area paths and popover state to DependencyLines</name>
  <files>
    packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
  </files>
  <action>
Modify DependencyLines.tsx to support clicking on dependency lines and showing a popover.

**Step 1 — Add state for clicked edge + popover position:**
```typescript
const [clickedEdge, setClickedEdge] = useState<{
  predecessorId: string;
  successorId: string;
  type: string;
  lag: number;
} | null>(null);
const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
```
Import useState from React (already imported).

**Step 2 — Add formatDepDescription() pure function above the component:**
```typescript
function formatDepDescription(
  type: string,
  lag: number,
  predecessorName: string
): string {
  const abslag = Math.abs(lag);
  if (type === 'FS') {
    if (lag > 0)  return `Через ${abslag} ${pluralDays(abslag)} после окончания «${predecessorName}»`;
    if (lag < 0)  return `За ${abslag} ${pluralDays(abslag)} до окончания «${predecessorName}»`;
    return `Сразу после окончания «${predecessorName}»`;
  }
  if (type === 'SS') {
    if (lag > 0)  return `Через ${abslag} ${pluralDays(abslag)} после начала «${predecessorName}»`;
    if (lag < 0)  return `За ${abslag} ${pluralDays(abslag)} до начала «${predecessorName}»`;
    return `Одновременно с началом «${predecessorName}»`;
  }
  if (type === 'FF') {
    if (lag > 0)  return `Через ${abslag} ${pluralDays(abslag)} после окончания «${predecessorName}»`;
    if (lag < 0)  return `За ${abslag} ${pluralDays(abslag)} до окончания «${predecessorName}»`;
    return `Одновременно с окончанием «${predecessorName}»`;
  }
  if (type === 'SF') {
    if (lag > 0)  return `Через ${abslag} ${pluralDays(abslag)} после начала «${predecessorName}»`;
    if (lag < 0)  return `За ${abslag} ${pluralDays(abslag)} до начала «${predecessorName}»`;
    return `Одновременно с началом «${predecessorName}»`;
  }
  return '';
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
}
```

**Step 3 — Remove `pointer-events: none` from the SVG element** (or override it inline):
Change the SVG element to `style={{ pointerEvents: 'none' }}` stays on visual paths but the SVG root needs pointer events for the hit areas. Instead:
- Keep `gantt-dependencies-svg` CSS class BUT add `pointer-events: none` to individual visual `<path>` elements via inline style
- The SVG root: remove `pointer-events: none` from CSS (update .gantt-dependencies-svg in CSS to NOT have pointer-events: none)
- Add `style={{ pointerEvents: 'none' }}` to each visual `<path>` and `<text>` element rendered in the map

**Step 4 — Add invisible hit-area path per line inside the SVG `<React.Fragment>`:**
```tsx
<path
  d={path}
  stroke="transparent"
  strokeWidth={12}
  fill="none"
  style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
  onClick={(e) => {
    e.stopPropagation();
    const edgeId = `${edge.predecessorId}-${edge.successorId}-${edge.type}`;
    if (clickedEdge && `${clickedEdge.predecessorId}-${clickedEdge.successorId}-${clickedEdge.type}` === edgeId) {
      // Toggle off
      setClickedEdge(null);
      setPopoverPos(null);
    } else {
      setClickedEdge({ predecessorId: edge.predecessorId, successorId: edge.successorId, type: edge.type, lag });
      setPopoverPos({ x: e.clientX, y: e.clientY });
    }
  }}
/>
```

NOTE: The hit-area path needs access to `edge` data (predecessorId, successorId, type). Currently the `lines` array doesn't include those — add them to the computed lines array:
```typescript
lines.push({
  id: `${edge.predecessorId}-${edge.successorId}-${edge.type}`,
  predecessorId: edge.predecessorId,  // ADD
  successorId: edge.successorId,      // ADD
  type: edge.type,                    // ADD
  path,
  hasCycle,
  lag,
  fromX, toX, fromY,
  reverseOrder,
});
```
Update the TypeScript array type annotation accordingly.

**Step 5 — Render popover as a fixed-position div outside the SVG**, after the closing `</svg>` tag, as a sibling:
```tsx
{clickedEdge && popoverPos && (() => {
  const pred = tasks.find(t => t.id === clickedEdge.predecessorId);
  const succ = tasks.find(t => t.id === clickedEdge.successorId);
  const predName = pred?.name ?? clickedEdge.predecessorId;
  const succName = succ?.name ?? clickedEdge.successorId;
  const description = formatDepDescription(clickedEdge.type, clickedEdge.lag, predName);
  return (
    <div
      className="gantt-dep-popover"
      style={{ left: popoverPos.x, top: popoverPos.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="gantt-dep-popover-title">{succName}</div>
      <div className="gantt-dep-popover-desc">{description}</div>
    </div>
  );
})()}
```

**Step 6 — Close popover on click outside**: Add a `useEffect` that listens for `document` `mousedown` events and clears `clickedEdge` + `popoverPos` when the target is not inside `.gantt-dep-popover`. Use a ref on the popover div or check `e.target.closest('.gantt-dep-popover')`.

The component currently wraps its return in just the SVG. Wrap the whole return in `<>...</>` (React Fragment) to accommodate the sibling popover div.

NOTE: The container wrapping the SVG is `position: relative`, so the popover must use `position: fixed` (not absolute) to anchor to viewport coordinates from the mouse event's clientX/clientY. The popover div should use `position: fixed`.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npm run build --workspace=packages/gantt-lib 2>&1 | tail -20</automated>
  </verify>
  <done>
    Build passes with no TypeScript errors. The dependency SVG no longer has pointer-events: none at root level. Each line has a transparent hit-area path with cursor: pointer. Clicking a line sets clickedEdge state and shows the popover div.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add popover CSS styles</name>
  <files>
    packages/gantt-lib/src/components/DependencyLines/DependencyLines.css
  </files>
  <action>
Append to DependencyLines.css:

```css
/* Hit-area cursor for dependency lines */
.gantt-dependency-hitarea {
  cursor: pointer;
}

/* Dependency line click popover */
.gantt-dep-popover {
  position: fixed;
  z-index: 1000;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px 14px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  min-width: 200px;
  max-width: 320px;
  pointer-events: auto;
  transform: translate(12px, -50%);
  font-size: 13px;
  line-height: 1.5;
}

.gantt-dep-popover-title {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gantt-dep-popover-desc {
  color: #475569;
}
```

The `transform: translate(12px, -50%)` offsets the popover 12px to the right of cursor and vertically centered on the click point.
  </action>
  <verify>
    <automated>grep -n "gantt-dep-popover" D:/Projects/gantt-lib/packages/gantt-lib/src/components/DependencyLines/DependencyLines.css</automated>
  </verify>
  <done>
    CSS file contains .gantt-dep-popover with position: fixed, z-index: 1000, box-shadow, and correct transform. .gantt-dep-popover-title and .gantt-dep-popover-desc rules present.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Clickable dependency lines with a fixed-position popover showing human-readable Russian description. Clicking any dependency arrow on the Gantt chart opens a popover with the successor task name and a lag-aware description like "Через 2 дня после окончания «Название задачи»".
  </what-built>
  <how-to-verify>
    1. Open the app (npm run dev from repo root, visit http://localhost:3000)
    2. Find a task with a dependency arrow visible on the Gantt chart
    3. Click the dependency line (the arrow)
    4. Verify a popover appears near the cursor with:
       - Successor task name in bold
       - Human-readable Russian description (e.g. "Сразу после окончания «...»" for FS lag=0)
    5. Try a dependency with lag: verify "Через N дней/день/дня после ..." wording
    6. Click outside the popover — it should close
    7. Click the same line again — popover should toggle closed
    8. Verify dragging tasks still works (lines remain drag-transparent)
    9. Verify task bars are still clickable and draggable
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- npm run build passes with no TypeScript errors
- Clicking a dependency line opens the popover with correct Russian text
- FS lag=0: "Сразу после окончания «X»"
- FS lag=2: "Через 2 дня после окончания «X»"
- FS lag=-2: "За 2 дня до окончания «X»"
- SS lag=0: "Одновременно с началом «X»"
- FF lag=0: "Одновременно с окончанием «X»"
- Popover closes on click outside
- No regressions on drag interactions
</verification>

<success_criteria>
Clicking a dependency arrow on the Gantt chart shows a popover with a human-readable Russian description of the dependency. The description correctly reflects the link type (FS/SS/FF/SF) and lag (positive, negative, or zero). Popover closes on click outside.
</success_criteria>

<output>
After completion, create .planning/quick/055-dep-link-click-popover/055-SUMMARY.md with what was built, files changed, and any notable decisions.
</output>
```
