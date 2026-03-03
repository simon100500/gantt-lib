---
phase: quick-44
plan: 44
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.css
autonomous: true
requirements: [QUICK-44]
must_haves:
  truths:
    - "Clicking a dep chip in the task list turns the corresponding SVG arrow red"
    - "Deselecting the chip (click again or press Escape) restores the arrow to its default color"
    - "Unrelated arrows keep their default color while one is selected"
  artifacts:
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx"
      provides: "selectedDep prop consumed to highlight matching path"
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "selectedChip state lifted here, passed to DependencyLines"
  key_links:
    - from: "TaskList.tsx (onChipSelect callback)"
      to: "GanttChart.tsx (selectedChip state)"
      via: "new onSelectedChipChange prop on TaskList"
    - from: "GanttChart.tsx"
      to: "DependencyLines.tsx"
      via: "selectedDep prop"
---

<objective>
When the user selects a dep chip in the task list, the corresponding dependency arrow in the Gantt grid turns red (highlighted). Deselecting the chip or pressing Escape restores the default color.

Purpose: Visual feedback connecting the task-list chip to its arrow in the chart.
Output: Red highlighted SVG dependency path + arrowhead when a chip is selected.
</objective>

<execution_context>
@D:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@D:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Key architecture:
- `selectedChip` state currently lives entirely inside `TaskList.tsx` — GanttChart never sees it.
- `DependencyLines` renders inside `GanttChart` and knows nothing about chip selection.
- Dependency arrows are identified by `{predecessorId}-{successorId}-{type}` (the `id` in `lines` array).
- An `arrowhead-cycle` red SVG marker already exists in DependencyLines — the selected marker can reuse the same red color.

<interfaces>
From packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx:
```typescript
export interface DependencyLinesProps {
  tasks: Task[];
  monthStart: Date;
  dayWidth: number;
  rowHeight: number;
  gridWidth: number;
  dragOverrides?: Map<string, { left: number; width: number }>;
  // NEW: selectedDep?: { predecessorId: string; successorId: string; linkType: string } | null
}
```

From packages/gantt-lib/src/components/TaskList/TaskList.tsx (internal state):
```typescript
const [selectedChip, setSelectedChip] = useState<{
  successorId: string;
  predecessorId: string;
  linkType: LinkType;
} | null>(null);
```

From packages/gantt-lib/src/components/TaskList/TaskList.tsx (props, add new):
// onSelectedChipChange?: (chip: { successorId: string; predecessorId: string; linkType: string } | null) => void;

From GanttChart props (add new):
// No new public props needed — selectedChip state is internal to GanttChart.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wire selectedChip from TaskList up to GanttChart and down to DependencyLines</name>
  <files>
    packages/gantt-lib/src/components/TaskList/TaskList.tsx,
    packages/gantt-lib/src/components/GanttChart/GanttChart.tsx,
    packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx,
    packages/gantt-lib/src/components/DependencyLines/DependencyLines.css
  </files>
  <action>
**Step 1 — TaskList.tsx:**
Add optional prop `onSelectedChipChange?: (chip: { successorId: string; predecessorId: string; linkType: string } | null) => void` to `TaskListProps` interface.
In `handleChipSelect`, after `setSelectedChip(chip)`, call `onSelectedChipChange?.(chip)`.
Also call `onSelectedChipChange?.(null)` wherever `setSelectedChip(null)` is called (in the Escape/outside-click effect and anywhere else the chip is cleared).

**Step 2 — GanttChart.tsx:**
Add internal state: `const [selectedChip, setSelectedChip] = useState<{ successorId: string; predecessorId: string; linkType: string } | null>(null);`
Pass `onSelectedChipChange={setSelectedChip}` to the `<TaskList>` component.
Pass `selectedDep={selectedChip}` to `<DependencyLines>`.

**Step 3 — DependencyLines.tsx:**
Add `selectedDep?: { predecessorId: string; successorId: string; linkType: string } | null` to `DependencyLinesProps`.
Add a new SVG `<marker>` with `id="arrowhead-selected"` using red fill `#ef4444` (same as the cycle marker, can copy it with a new id).
In the `lines.map(...)` render loop, compute `isSelected` for each line:
```typescript
const isSelected =
  selectedDep != null &&
  id === `${selectedDep.predecessorId}-${selectedDep.successorId}-${selectedDep.linkType}`;
```
Apply `isSelected` class to the `<path>` (e.g., add `gantt-dependency-selected` class alongside existing classes).
Use `markerEnd={isSelected ? 'url(#arrowhead-selected)' : hasCycle ? 'url(#arrowhead-cycle)' : 'url(#arrowhead)'}`.
When `isSelected`, also render the lag label in red (`#ef4444`).

**Step 4 — DependencyLines.css:**
Add:
```css
/* Selected dependency highlighting */
.gantt-dependency-selected {
  stroke: #ef4444;
  stroke-width: 2;
}
```
</action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npm run build --workspace=packages/gantt-lib 2>&1 | tail -5</automated>
  </verify>
  <done>
    Clicking a dep chip turns its SVG arrow red (stroke #ef4444, stroke-width 2, red arrowhead). Clicking the same chip again or pressing Escape deselects and the arrow returns to default gray. Other arrows remain gray.
  </done>
</task>

</tasks>

<verification>
Build passes with no TypeScript errors. Visually: selecting a chip highlights exactly one arrow in red; deselecting restores it.
</verification>

<success_criteria>
- TypeScript build passes with 0 errors
- Selected dep chip arrow renders in red (#ef4444) with stroke-width 2
- Unselected arrows remain in default color
- Deselect (click again or Escape) restores arrow to default
</success_criteria>

<output>
After completion, create `.planning/quick/44-selected-dep-chip-highlights-its-arrow-r/44-SUMMARY.md`
</output>
