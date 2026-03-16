---
phase: quick-260316-wyw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: [DEP-EDIT-POPUP]

must_haves:
  truths:
    - "Click on dependency chip opens a popover (not native tooltip)"
    - "Popover shows lag counter with +/- buttons and inline label"
    - "Changing lag in popover shifts successor task startDate/endDate"
    - "Popover contains delete button for removing dependency"
    - "Popover closes on outside click or X button"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "DepChip with Popover instead of title tooltip, lag editing"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Styles for dep edit popover and lag counter"
  key_links:
    - from: "DepChip popover lag counter"
      to: "onTasksChange callback"
      via: "calculateSuccessorDate + date shift logic"
      pattern: "onTasksChange.*startDate.*endDate"
---

<objective>
Replace the native title tooltip on dependency chips with an interactive Radix Popover
that shows a human-readable dependency description and allows editing the lag (which
shifts the successor task's dates) and deleting the dependency link.

Purpose: Enable inline editing of dependency lag directly from the chip, improving UX
over the current tooltip-only approach.

Output: Updated DepChip component with Popover, lag counter UI, date-shifting logic.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@packages/gantt-lib/src/components/TaskList/TaskList.css
@packages/gantt-lib/src/components/ui/Popover.tsx
@packages/gantt-lib/src/utils/dependencyUtils.ts

<interfaces>
From TaskListRow.tsx — DepChip props and key functions:
```typescript
interface DepChipProps {
  lag?: number;
  dep: { taskId: string; type: LinkType };
  taskId: string;              // successor task ID
  predecessorName?: string;
  selectedChip: TaskListRowProps['selectedChip'];
  disableDependencyEditing: boolean;
  onChipSelect: TaskListRowProps['onChipSelect'];
  onRowClick: TaskListRowProps['onRowClick'];
  onScrollToTask: TaskListRowProps['onScrollToTask'];
  onRemoveDependency: TaskListRowProps['onRemoveDependency'];
  onChipSelectClear: () => void;
}

// Available in TaskListRow scope (must be threaded to DepChip):
onTasksChange?: (tasks: Task[]) => void;
allTasks?: Task[];
```

From dependencyUtils.ts:
```typescript
export function computeLagFromDates(linkType, predStart, predEnd, succStart, succEnd): number;
export function calculateSuccessorDate(predStart, predEnd, linkType, lag): Date;
```

From Popover.tsx (Radix wrapper):
```typescript
export const Popover: React.FC<{ open?; onOpenChange?; children }>;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverContent: React.FC<{ children; className?; align?; side?; portal?; collisionPadding?; onInteractOutside? }>;
```

Current formatDepDescription (line 154-178) generates text like:
- "Начать сразу после окончания" (FS, lag=0)
- "Начать через 3 дн. после окончания" (FS, lag=3)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Convert DepChip from title tooltip to Popover with lag counter and delete</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx, packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
Refactor the DepChip component (lines 180-248 in TaskListRow.tsx) to use a Radix Popover instead of the native `title` attribute:

1. **Add props to DepChip:**
   - `task: Task` (the successor task — needed for date computation)
   - `allTasks: Task[]` (all tasks — needed to find predecessor dates)
   - `onTasksChange: TaskListRowProps['onTasksChange']` (callback to save date changes)

2. **Add state to DepChip:**
   - `const [popoverOpen, setPopoverOpen] = useState(false)` — controls popover visibility

3. **Replace the outer `<span className="gantt-tl-dep-chip-wrapper">` with a `<Popover>` wrapper:**
   ```
   <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
     <PopoverTrigger asChild>
       <span className="gantt-tl-dep-chip ..." onClick={handleClick}>
         <Icon />{lagLabel}
       </span>
     </PopoverTrigger>
     <PopoverContent className="gantt-tl-dep-edit-popover" portal={true} align="start">
       {popover content}
     </PopoverContent>
   </Popover>
   ```

4. **Rework handleClick:** On click, toggle `popoverOpen`. Keep the chip selection logic (`onChipSelect`) so the line highlights. Remove the `title` attribute from the chip `<span>`.

5. **Popover content layout (flexbox column, gap 8px):**

   a) **Description line** — use `formatDepDescription` but make it interactive:
      - For FS type (most common): "Начать [сразу] после окончания {predecessorName}" when lag=0, or "Начать через [N][-][+] дн. после окончания {predecessorName}" when lag>0
      - The `[N]` part is a small `<input type="number">` (width ~40px, styled), `[-]` and `[+]` are small buttons
      - For negative lag, show accordingly
      - Use a simplified approach: show the full `formatDepDescription` text, but replace the lag number with the interactive counter, and append predecessorName

      Simplified UI structure inside popover:
      ```
      <div class="gantt-tl-dep-edit-popover">
        <div class="gantt-tl-dep-edit-row">
          <span class="gantt-tl-dep-edit-label">{actionVerb}</span>
          {lag === 0 ? (
            <button class="gantt-tl-dep-edit-instant" onClick={incrementLag}>сразу</button>
          ) : (
            <>
              <span>через</span>
              <button class="gantt-tl-dep-edit-btn" onClick={decrementLag}>-</button>
              <span class="gantt-tl-dep-edit-value">{Math.abs(lag)}</span>
              <button class="gantt-tl-dep-edit-btn" onClick={incrementLag}>+</button>
              <span>дн.</span>
            </>
          )}
          <span>{afterWhat}</span>
        </div>
        <div class="gantt-tl-dep-edit-pred">{predecessorName}</div>
        <hr class="gantt-tl-dep-edit-divider" />
        <button class="gantt-tl-dep-edit-delete" onClick={handleDelete}>
          <TrashIcon /> Удалить связь
        </button>
      </div>
      ```

      Where `actionVerb` / `afterWhat` depend on link type:
      - FS: "Начать" / "после окончания"
      - SS: "Начать" / "после начала"
      - FF: "Завершить" / "после окончания"
      - SF: "Завершить" / "после начала"

   b) **Delete button** — move the trash button from outside the chip into the popover. Remove the external `.gantt-tl-dep-chip-trash` button. Keep the same `handleTrashClick` logic (calls `onRemoveDependency`). After delete, close popover.

6. **Lag change handler (the core logic):**
   ```typescript
   const handleLagChange = useCallback((newLag: number) => {
     if (!onTasksChange || !allTasks) return;
     const taskById = new Map(allTasks.map(t => [t.id, t]));
     const predecessor = taskById.get(dep.taskId);
     if (!predecessor) return;

     const predStart = parseUTCDate(predecessor.startDate);
     const predEnd = parseUTCDate(predecessor.endDate);
     const origStart = parseUTCDate(task.startDate);
     const origEnd = parseUTCDate(task.endDate);
     const durationMs = origEnd.getTime() - origStart.getTime();

     const constraintDate = calculateSuccessorDate(predStart, predEnd, dep.type, newLag);

     let newStart: Date, newEnd: Date;
     if (dep.type === 'FS' || dep.type === 'SS') {
       newStart = constraintDate;
       newEnd = new Date(constraintDate.getTime() + durationMs);
     } else {
       newEnd = constraintDate;
       newStart = new Date(constraintDate.getTime() - durationMs);
     }

     onTasksChange([{
       ...task,
       startDate: newStart.toISOString().split('T')[0],
       endDate: newEnd.toISOString().split('T')[0],
     }]);
   }, [dep, task, allTasks, onTasksChange]);
   ```

   The `-` button calls `handleLagChange(lag - 1)`, the `+` button calls `handleLagChange(lag + 1)`. When lag is 0 and clicking the "сразу" text, it calls `handleLagChange(1)`.

   Note: Do NOT use `universalCascade` here — `onTasksChange` propagates through the existing cascade engine in GanttChart. Just shift the immediate successor's dates.

7. **Thread new props through DepChip usage sites** (lines ~1031 and ~1051):
   - Pass `task={task}`, `allTasks={allTasks}`, `onTasksChange={onTasksChange}` to both DepChip render sites.

8. **CSS additions** (TaskList.css, after line ~699):
   ```css
   .gantt-tl-dep-edit-popover {
     font-size: 0.8rem;
     color: #374151;
     padding: 10px 12px;
     display: flex;
     flex-direction: column;
     gap: 6px;
     min-width: 200px;
   }

   .gantt-tl-dep-edit-row {
     display: flex;
     align-items: center;
     gap: 4px;
     flex-wrap: wrap;
   }

   .gantt-tl-dep-edit-btn {
     display: inline-flex;
     align-items: center;
     justify-content: center;
     width: 22px;
     height: 22px;
     border: 1px solid #d1d5db;
     border-radius: 4px;
     background: #f9fafb;
     cursor: pointer;
     font-size: 0.85rem;
     color: #374151;
     padding: 0;
     line-height: 1;
   }

   .gantt-tl-dep-edit-btn:hover {
     background: #e5e7eb;
   }

   .gantt-tl-dep-edit-value {
     display: inline-flex;
     align-items: center;
     justify-content: center;
     min-width: 24px;
     font-weight: 600;
     text-align: center;
   }

   .gantt-tl-dep-edit-instant {
     background: rgba(59, 130, 246, 0.1);
     border: 1px solid rgba(59, 130, 246, 0.3);
     border-radius: 4px;
     padding: 2px 8px;
     color: #1d4ed8;
     cursor: pointer;
     font-size: 0.8rem;
   }

   .gantt-tl-dep-edit-instant:hover {
     background: rgba(59, 130, 246, 0.2);
   }

   .gantt-tl-dep-edit-pred {
     font-weight: 500;
     color: #111827;
     white-space: nowrap;
     overflow: hidden;
     text-overflow: ellipsis;
     max-width: 220px;
   }

   .gantt-tl-dep-edit-divider {
     border: none;
     border-top: 1px solid #e5e7eb;
     margin: 2px 0;
   }

   .gantt-tl-dep-edit-delete {
     display: flex;
     align-items: center;
     gap: 6px;
     background: none;
     border: none;
     color: #ef4444;
     cursor: pointer;
     padding: 4px 0;
     font-size: 0.8rem;
   }

   .gantt-tl-dep-edit-delete:hover {
     color: #dc2626;
     text-decoration: underline;
   }
   ```

9. **Remove old CSS for external trash button visibility logic:**
   Remove the `.gantt-tl-dep-chip-wrapper:has(.gantt-tl-dep-chip-selected) .gantt-tl-dep-chip-trash` rule (line ~677) and the `.gantt-tl-dep-chip-trash` styles (lines ~661-683) since the trash button moves inside the popover. Keep `.gantt-tl-dep-chip-wrapper` with its inline-flex layout.

   Actually, keep `.gantt-tl-dep-chip-trash` styles but just remove the external button from the DepChip render — the delete button inside popover uses new classes. Old trash CSS can be cleaned up.

10. **Handle popover open state with chip selection:** When popover opens, also call `onChipSelect` to highlight the dependency line. When popover closes (onOpenChange false), call `onChipSelect(null)` to deselect. This replaces the current click-to-select/deselect pattern.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - Clicking a dependency chip opens a Popover (not a native tooltip)
    - Popover shows "Начать [сразу] после окончания {TaskName}" for FS lag=0
    - Popover shows lag counter with -/+ buttons for non-zero lag
    - Clicking +/- shifts the successor task's startDate/endDate
    - Popover contains "Удалить связь" button that removes the dependency
    - Popover closes on outside click
    - Old external trash button is removed from chip wrapper
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Interactive dependency edit popover replacing native tooltip on dep chips</what-built>
  <how-to-verify>
    1. Open the demo at http://localhost:3000 (run `npm run dev` in packages/website if not running)
    2. Find a task with a dependency chip in the task list (the small colored icons like FS, SS)
    3. Click on the chip — a popover should appear (not a browser tooltip)
    4. Verify the popover shows:
       - Descriptive text like "Начать [сразу] после окончания" with predecessor task name
       - If lag=0: clickable "сразу" label
       - Click + button — lag becomes 1, text changes to "через 1 дн.", task bar shifts right by 1 day on the chart
       - Click - button — lag decreases, task bar shifts left
    5. Verify "Удалить связь" button in popover removes the dependency
    6. Verify clicking outside the popover closes it
    7. Verify that the old external trash icon next to the chip is gone
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- Build passes: `npm run build` in packages/gantt-lib
- No TypeScript errors
- Popover opens/closes correctly
- Lag counter changes dates, not the lag field
- Delete button works from inside popover
</verification>

<success_criteria>
- Native title tooltip replaced with interactive Radix Popover on all dependency chips
- Lag counter (+/-) shifts successor task dates via onTasksChange
- Delete dependency button moved inside the popover
- Visual design consistent with existing gantt-lib popover styles
</success_criteria>

<output>
After completion, create `.planning/quick/260316-wyw-dependency-edit-popup/260316-wyw-SUMMARY.md`
</output>
