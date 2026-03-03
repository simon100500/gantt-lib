---
phase: quick-055
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "Clicking a dep chip opens a Radix Popover showing a human-readable Russian description of the link"
    - "Description correctly reflects link type (FS/SS/FF/SF) and lag (positive, negative, or zero)"
    - "Popover closes when the chip is deselected (clicked again or another chip selected)"
    - "Existing chip selection, scroll-to-task, and trash-delete behaviors remain intact"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "DepChip with integrated Popover, formatDepDescription helper"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: ".gantt-tl-dep-info-popover styles"
  key_links:
    - from: "DepChip"
      to: "Popover (Radix)"
      via: "open={isSelected} controlled popover"
      pattern: "open=\\{isSelected\\}"
---

<objective>
Show a human-readable Radix Popover when a dep chip is clicked, describing the dependency type and lag in Russian.

Purpose: Users currently see only an icon + lag number on chips (e.g., FS icon + "+2"). A popover on click gives the full meaning: "Через 2 дня после окончания [task name]".

Output: Updated DepChip renders a controlled Radix Popover (open when chip isSelected) with a formatted description string. New CSS class for popover content. No new files.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

Key facts:
- `DepChip` is a local component inside `TaskListRow.tsx` (not exported)
- `DepChip` already receives: `dep.type` (LinkType), `lag` (number|undefined), `predecessorName` (string|undefined)
- `isSelected` is already computed in DepChip from `selectedChip` state
- Chip click currently: toggles selectedChip state, calls onRowClick + onScrollToTask when selecting
- `Popover`, `PopoverTrigger`, `PopoverContent` are already imported in `TaskListRow.tsx` from `../ui/Popover`
- Radix Popover supports `open` prop for controlled mode
- `PopoverContent` accepts `portal={true}`, `align`, `side` — use `side="top"` to appear above the chip
- CSS class prefix for TaskList: `gantt-tl-`

<interfaces>
From packages/gantt-lib/src/components/TaskList/TaskListRow.tsx (relevant DepChip parts):

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

// isSelected (computed inside DepChip):
const isSelected =
  selectedChip?.successorId === taskId &&
  selectedChip?.predecessorId === dep.taskId &&
  selectedChip?.linkType === dep.type;
```

From packages/gantt-lib/src/components/ui/Popover.tsx:
```typescript
export const Popover: React.FC<{ open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }>
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverContent: React.FC<{ children, className?, align?, side?, portal?, collisionPadding? }>
// portal renders into RadixPopover.Portal (above z-index stack)
```

From packages/gantt-lib/src/components/TaskList/DepIcons.tsx:
```typescript
export type LinkType = 'FS' | 'SS' | 'FF' | 'SF';
// LINK_TYPE_ICONS already imported in TaskListRow
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add formatDepDescription helper and wire Popover into DepChip</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
Add a pure helper function `formatDepDescription` above the `DepChip` component definition. Then wrap the existing chip `<span>` in a controlled `<Popover open={isSelected}>` with a `<PopoverContent>` showing the formatted description.

**1. Add helper function (above DepChip component):**

```typescript
function formatDepDescription(type: LinkType, lag: number | undefined, predecessorName: string): string {
  const effectiveLag = lag ?? 0;
  const name = predecessorName;

  if (type === 'FS') {
    if (effectiveLag > 0)  return `Через ${effectiveLag} дн. после окончания ${name}`;
    if (effectiveLag < 0)  return `За ${Math.abs(effectiveLag)} дн. до окончания ${name}`;
    return `После окончания ${name}`;
  }
  if (type === 'FF') {
    if (effectiveLag > 0)  return `Через ${effectiveLag} дн. после окончания ${name}`;
    if (effectiveLag < 0)  return `За ${Math.abs(effectiveLag)} дн. до окончания ${name}`;
    return `После окончания ${name}`;
  }
  if (type === 'SS') {
    if (effectiveLag > 0)  return `Через ${effectiveLag} дн. после начала ${name}`;
    if (effectiveLag < 0)  return `За ${Math.abs(effectiveLag)} дн. до начала ${name}`;
    return `Одновременно с началом ${name}`;
  }
  if (type === 'SF') {
    if (effectiveLag > 0)  return `Через ${effectiveLag} дн. после начала ${name}`;
    if (effectiveLag < 0)  return `За ${Math.abs(effectiveLag)} дн. до начала ${name}`;
    return `До начала ${name}`;
  }
  return name;
}
```

Note on FS vs FF vs SF vs SS distinction in the examples from spec:
- FS+2 -> "Через 2 дня после окончания [name]" — end-based
- FF0  -> "После окончания [name]" — end-based
- FF-2 -> "За 2 дня до окончания [name]" — end-based
- SS   -> "Одновременно с началом [name]" — start-based
- SS+2 -> "Через 2 дня после начала [name]" — start-based
- SF   -> "До начала [name]" — SF zero lag means "end of this = start of predecessor"

FS and FF both use "окончания" (end of predecessor). SS and SF both use "начала" (start of predecessor).

**2. Modify DepChip JSX return:**

Replace the current `return (...)` in DepChip with a Popover-wrapped version. The chip `<span>` becomes the `PopoverTrigger` (use `asChild`). The `PopoverContent` shows the description text.

Current return structure:
```jsx
return (
  <span className="gantt-tl-dep-chip-wrapper">
    <span className={...} title={predecessorName} onClick={handleClick}>
      <><Icon />{lag ...}</>
    </span>
    {!disableDependencyEditing && (
      <button ... onClick={handleTrashClick}><TrashIcon /></button>
    )}
  </span>
);
```

New return structure:
```jsx
const description = formatDepDescription(dep.type, lag, predecessorName ?? dep.taskId);

return (
  <Popover open={isSelected} onOpenChange={(open) => { if (!open) onChipSelectClear(); }}>
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
    <PopoverContent portal={true} side="top" align="start" className="gantt-tl-dep-info-popover">
      {description}
    </PopoverContent>
  </Popover>
);
```

Important: `Popover` root must wrap both `PopoverTrigger` and `PopoverContent`. The trigger is the chip `<span>` (asChild). The `<span className="gantt-tl-dep-chip-wrapper">` sits inside the Popover but outside the Trigger. This is valid with Radix — Trigger just needs to be a direct child of Popover.Root at some level.

If Radix requires `PopoverTrigger` to be a direct sibling or at top level within `Popover`, restructure accordingly — move the wrapper `<span>` outside and wrap only the chip span in the trigger.

The simplest valid structure when using asChild with a non-button element:
```jsx
<Popover open={isSelected} onOpenChange={(open) => { if (!open) onChipSelectClear(); }}>
  <span className="gantt-tl-dep-chip-wrapper">
    <PopoverTrigger asChild>
      <span ... onClick={handleClick}>...</span>
    </PopoverTrigger>
    {trashButton}
  </span>
  <PopoverContent ...>{description}</PopoverContent>
</Popover>
```

Radix Popover.Root accepts any children structure — Trigger and Content don't need to be direct children, just descendants. This structure is valid.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npx tsc --project packages/gantt-lib/tsconfig.json --noEmit 2>&1 | grep -v "useTaskDrag\|node_modules" | head -20</automated>
  </verify>
  <done>
    - `formatDepDescription` function exists above DepChip component
    - DepChip return wraps content in `&lt;Popover open={isSelected}&gt;`
    - `PopoverContent` rendered with `side="top"` showing description string
    - TypeScript compiles with no new errors in TaskListRow.tsx
  </done>
</task>

<task type="auto">
  <name>Task 2: Add CSS for dep info popover content</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
Add CSS rule for `.gantt-tl-dep-info-popover` class at the end of the dependency chip section (around line 316, after the existing `.gantt-tl-dep-chip-trash:hover` rule).

```css
/* Dep chip info popover — human-readable dependency description on click */
.gantt-tl-dep-info-popover {
  font-size: 0.75rem;
  color: #374151;
  padding: 6px 10px !important;
  white-space: nowrap;
  max-width: 260px;
  white-space: normal;
  line-height: 1.4;
}
```

The `.gantt-popover` base class (from `ui.css`) already provides: background, border, border-radius, box-shadow, z-index, animation. The `gantt-tl-dep-info-popover` class only needs to override padding and set text styles.

Note: `!important` on padding overrides the `gantt-popover` default `padding: 4px`.
  </action>
  <verify>
    <automated>grep -n "gantt-tl-dep-info-popover" D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css</automated>
  </verify>
  <done>
    - `.gantt-tl-dep-info-popover` rule exists in TaskList.css with font-size, color, padding, and max-width
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles cleanly: `npx tsc --project packages/gantt-lib/tsconfig.json --noEmit` shows no new errors in TaskListRow.tsx
2. `formatDepDescription('FS', 2, 'Фундамент')` returns `"Через 2 дн. после окончания Фундамент"`
3. `formatDepDescription('SS', 0, 'Фундамент')` returns `"Одновременно с началом Фундамент"`
4. `formatDepDescription('SF', undefined, 'Фундамент')` returns `"До начала Фундамент"`
5. Manual: Click a dep chip in the task list — popover appears above the chip with the description. Click again — popover closes.
</verification>

<success_criteria>
- Clicking any dep chip (single inline chip or chip inside overflow popover) shows a Radix Popover above the chip with a Russian human-readable description
- Description matches spec examples:
  - FS+2 -> "Через 2 дн. после окончания [name]"
  - FF0  -> "После окончания [name]"
  - FF-2 -> "За 2 дн. до окончания [name]"
  - SS   -> "Одновременно с началом [name]"
  - SS+2 -> "Через 2 дн. после начала [name]"
  - SF   -> "До начала [name]"
- Existing behaviors intact: chip selection (blue highlight), scroll-to-task, trash button delete
- TypeScript: no new errors in modified files
</success_criteria>

<output>
After completion, create `.planning/quick/055-popover-dep-chip/055-SUMMARY.md`
</output>
