---
phase: quick-056
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.css
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: [QUICK-056]

must_haves:
  truths:
    - "Клик по линии связи на диаграмме подсвечивает её красным (без поповера)"
    - "Клик по чипу связи в TaskList открывает поповер ниже ячейки с человекочитаемым описанием"
    - "Клик вне поповера закрывает его"
    - "Поповер содержит корректные фразы для всех типов связей (FS/SS/FF/SF) с учётом лага"
  artifacts:
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx"
      provides: "Click-to-highlight line (no popover)"
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Chip click opens description popover below cell"
  key_links:
    - from: "DepChip onClick"
      to: "popover with formatDepDescription text"
      via: "local popoverOpen state in DepChip"
---

<objective>
Rework dependency UX:
1. Dependency line (SVG): click highlights the line red — no popover.
2. Dep chip in TaskList: click shows a popover below the active cell with a human-readable description of the dependency.

Purpose: Cleaner UX — lines show selection state, chips show semantic context.
Output: Modified DependencyLines.tsx (no popover), modified TaskListRow.tsx (chip popover with description).
</objective>

<execution_context>
@D:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
@packages/gantt-lib/src/components/DependencyLines/DependencyLines.css
@packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@packages/gantt-lib/src/components/TaskList/TaskList.css

<interfaces>
<!-- formatDepDescription already exists in DependencyLines.tsx — move or duplicate to TaskListRow -->
<!-- Existing signature: formatDepDescription(type: string, lag: number, predecessorName: string): string -->

From DependencyLines.tsx (lines 37-64):
```typescript
function formatDepDescription(type: string, lag: number, predecessorName: string): string {
  // FS/SS/FF/SF with lag>0, lag<0, lag=0 cases
  // Returns Russian human-readable string
}
```

From TaskListRow.tsx — DepChip props:
```typescript
interface DepChipProps {
  lag?: number;
  dep: { taskId: string; type: LinkType };
  taskId: string;
  predecessorName?: string;
  selectedChip: TaskListRowProps['selectedChip'];
  disableDependencyEditing: boolean;
  onChipSelect: TaskListRowProps['onChipSelect'];
  onRowClick: TaskListRowProps['onRowClick'];
  onScrollToTask: TaskListRowProps['onScrollToTask'];
  onRemoveDependency: TaskListRowProps['onRemoveDependency'];
  onChipSelectClear: () => void;
}
```

Existing Popover components already imported in TaskListRow.tsx:
```typescript
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove popover from DependencyLines — keep click-to-highlight only</name>
  <files>
    packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
    packages/gantt-lib/src/components/DependencyLines/DependencyLines.css
  </files>
  <action>
In DependencyLines.tsx:

1. Remove `popoverPos` state and its setter (line 107: `const [popoverPos, setPopoverPos] = useState...`).

2. Remove the `useEffect` that closes the popover on outside click (lines 110-121) — no longer needed since there's no popover to close.

3. Keep `clickedEdge` state as the click-highlight toggle. The line already becomes red when `isClickedEdge` is true via existing class/marker logic — but currently `isClickedEdge` is only used for the popover conditional. Wire it up to visually highlight the line:
   - When `clickedEdge` matches an edge, apply red stroke to that line (same as `isSelected`/`selectedDep` logic).
   - In the path rendering, define `isHighlighted = isSelected || isClickedEdge`.
   - Use `isHighlighted` instead of `isSelected` for `pathClassName`, `markerEnd`, and `lagColor`.

4. In the hit-area path `onClick`: remove the `setPopoverPos` call. Keep the toggle logic: if `isClickedEdge` → clear, else → `setClickedEdge({ predecessorId, successorId, type, lag })`. Also add a global document click handler (useEffect, same pattern as before) to clear `clickedEdge` on outside clicks — listen for any click on the document and clear if the click target is not inside `.gantt-dependencies-svg`. Use `onClick` on the SVG container to catch SVG-area clicks, or attach to document with a check for `target.closest('svg.gantt-dependencies-svg')`.

   Simpler approach: keep only the hit-area toggle, no outside-click cleanup needed (the line just stays highlighted until clicked again — consistent with chip select behavior).

5. Remove the entire popover JSX block (lines 370-386) that renders the `<div className="gantt-dep-popover">` outside the SVG.

6. Keep `formatDepDescription` and `pluralDays` functions in this file (they will also be needed in TaskListRow but can be duplicated there).

In DependencyLines.css:
- Keep the `.gantt-dep-popover`, `.gantt-dep-popover-title`, `.gantt-dep-popover-desc` classes — they will be reused in TaskListRow for the chip popover. Do NOT delete them.
  </action>
  <verify>npm run build --workspace=packages/gantt-lib 2>&1 | tail -5</verify>
  <done>Clicking a dependency line highlights it red; no popover appears. Clicking again deselects it. Build passes with no TypeScript errors.</done>
</task>

<task type="auto">
  <name>Task 2: Chip click popover with human-readable dependency description in TaskListRow</name>
  <files>
    packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    packages/gantt-lib/src/components/TaskList/TaskList.css
  </files>
  <action>
In TaskListRow.tsx:

1. Add `formatDepDescription` and `pluralDays` helper functions at the top of the file (copy from DependencyLines.tsx — same logic):

```typescript
function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
}

function formatDepDescription(type: string, lag: number, predecessorName: string): string {
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
```

2. Modify `DepChip` to show a popover on click instead of (or alongside) the existing chip select behavior:

Add local state to `DepChip`:
```typescript
const [popoverOpen, setPopoverOpen] = useState(false);
```

Import `useState` is already imported at the top of the file via `React` — add to the destructured import if needed.

Change `handleClick` in DepChip:
```typescript
const handleClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (disableDependencyEditing) {
    // Even in read-only mode, show description popover
    setPopoverOpen(v => !v);
    return;
  }
  // Select the chip (for red arrow highlight)
  onChipSelect?.(isSelected ? null : { successorId: taskId, predecessorId: dep.taskId, linkType: dep.type });
  if (!isSelected) {
    onRowClick?.(taskId);
    onScrollToTask?.(taskId);
    setPopoverOpen(true);
  } else {
    setPopoverOpen(false);
  }
};
```

3. Wrap the `<span className="gantt-tl-dep-chip-wrapper">` in a `Popover` component:

```tsx
const description = formatDepDescription(dep.type, lag ?? 0, predecessorName ?? dep.taskId);

return (
  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
    <span className="gantt-tl-dep-chip-wrapper">
      <PopoverTrigger asChild>
        <span
          className={`gantt-tl-dep-chip${isSelected ? ' gantt-tl-dep-chip-selected' : ''}`}
          title={predecessorName}
          onClick={handleClick}
        >
          <><Icon />{lag != null && lag !== 0 ? (lag > 0 ? `+${lag}` : `${lag}`) : ''}</>
        </span>
      </PopoverTrigger>
      {!disableDependencyEditing && (
        <button
          type="button"
          className="gantt-tl-dep-chip-trash"
          aria-label="Удалить связь"
          onClick={handleTrashClick}
        >
          <TrashIcon />
        </button>
      )}
    </span>
    <PopoverContent portal={true} align="start" side="bottom" className="gantt-tl-dep-desc-popover">
      <div className="gantt-dep-popover-desc">{description}</div>
    </PopoverContent>
  </Popover>
);
```

Note: `PopoverTrigger asChild` wraps the inner `<span>` chip. The trash button stays outside the trigger but inside the wrapper span.

4. In TaskList.css, add styling for the chip description popover:

```css
/* Dependency chip description popover */
.gantt-tl-dep-desc-popover {
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.5;
  color: #475569;
  max-width: 280px;
  min-width: 160px;
}
```

The `PopoverContent` already handles background, border, shadow via its own CSS (from ui/Popover component). Only padding/font/color needed here.
  </action>
  <verify>npm run build --workspace=packages/gantt-lib 2>&1 | tail -5</verify>
  <done>
- Clicking a dep chip in TaskList opens a popover below it with correct Russian description (e.g. "Сразу после окончания «Название задачи»", "Через 2 дня после начала «Название задачи»").
- Clicking outside closes the popover.
- The red arrow highlight on the SVG line still fires when the chip is clicked (onChipSelect still called).
- Build passes with no TypeScript errors.
  </done>
</task>

</tasks>

<verification>
After both tasks complete:
1. Click a dependency line in the Gantt chart — it turns red, no popover.
2. Click it again — deselects (returns to normal color).
3. Click a dep chip in the task list — popover appears below the chip with human-readable text.
4. Verify all 4 link types × lag variants show correct phrases:
   - FS+0: "Сразу после окончания «...»"
   - FS+2: "Через 2 дня после окончания «...»"
   - FS-2: "За 2 дня до окончания «...»"
   - SS+0: "Одновременно с началом «...»"
   - SS+2: "Через 2 дня после начала «...»"
   - FF+0: "Одновременно с окончанием «...»"
   - SF+0: "Одновременно с началом «...»"
5. Click outside the popover — it closes.
</verification>

<success_criteria>
- Dependency line click: red highlight only, no popover rendered
- Dep chip click: popover below cell with human-readable description
- Popover closes on outside click (via onOpenChange from Popover component)
- Build passes: `npm run build --workspace=packages/gantt-lib`
</success_criteria>

<output>
After completion, create `.planning/quick/056-dep-ux-rework/056-SUMMARY.md`
</output>
