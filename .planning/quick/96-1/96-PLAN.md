---
phase: quick
plan: 096-milestone-task-type
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/types/index.ts
  - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
  - packages/gantt-lib/src/components/TaskRow/TaskRow.css
autonomous: true
requirements:
  - MST-001
  - MST-002
  - MST-003

must_haves:
  truths:
    - "Milestone tasks render as diamond shapes instead of rectangular bars"
    - "Milestone tasks have 1 day duration (startDate equals endDate)"
    - "Milestone diamond is centered on the day column"
    - "Milestone tasks display task name to the right of the diamond"
    - "Milestone diamond uses the task's color (or default color)"
  artifacts:
    - path: "packages/gantt-lib/src/types/index.ts"
      provides: "Task.type property for milestone detection"
      exports: ["Task.type?: 'task' | 'milestone'"]
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx"
      provides: "Diamond shape rendering logic for milestones"
      min_lines: 20
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.css"
      provides: "CSS styling for milestone diamond shape"
      contains: ".gantt-tr-milestone"
  key_links:
    - from: "TaskRow.tsx"
      to: "CSS diamond rendering"
      via: "Conditional rendering based on task.type === 'milestone'"
      pattern: "task\.type.*milestone"
    - from: "Task interface"
      to: "TaskRow rendering"
      via: "type property determines bar vs diamond"
      pattern: "type.*milestone.*diamond"
---

<objective>
Add milestone task type that renders as a diamond shape with 1-day duration.

Purpose: Milestones are important project markers (deadlines, deliverables, approvals) that need visual distinction from regular tasks. Current implementation only supports rectangular task bars.

Output: Task.type property added, milestones render as diamonds centered on day column with name label to the right.
</objective>

<execution_context>
@D:/Projects/gantt-lib/.claude/get-shit-done/workflows/execute-plan.md
@D:/Projects/gantt-lib/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@D:/Projects/gantt-lib/packages/gantt-lib/src/types/index.ts
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskRow/TaskRow.css

## Key interfaces from existing code

From types/index.ts (lines 49-87):
```typescript
export interface Task {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  color?: string;
  parentId?: string;
  progress?: number;
  accepted?: boolean;
  dependencies?: TaskDependency[];
  locked?: boolean;
}
```

From TaskRow.tsx (lines 266-298):
```typescript
<div
  data-taskbar
  className={`gantt-tr-taskBar ${isDragging ? 'gantt-tr-dragging' : ''} ${task.locked ? 'gantt-tr-locked' : ''} ${isParent ? 'gantt-tr-parentBar' : ''}`}
  style={{
    left: `${displayLeft}px`,
    width: `${displayWidth}px`,
    ...parentBarStyle,
    height: isParent ? 'var(--gantt-parent-bar-height, 14px)' : 'var(--gantt-task-bar-height)',
  }}
>
  {/* Progress bar, resize handles, duration label */}
</div>
```

Current rendering pattern: All tasks render as rectangular bars with `displayWidth` calculated from date range. Parent tasks have thinner height and special gradient styling.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Task.type property to support milestone tasks</name>
  <files>packages/gantt-lib/src/types/index.ts</files>
  <action>
Add type property to Task interface to distinguish milestones from regular tasks:

1. **Define TaskType union type:**
   ```typescript
   export type TaskType = 'task' | 'milestone';
   ```

2. **Add type property to Task interface:**
   ```typescript
   export interface Task {
     // ... existing properties
     /** Task type: 'task' for regular bars, 'milestone' for diamond shape */
     type?: TaskType;
   }
   ```

3. **Update exports in index.ts** to ensure TaskType is exported for consumers

Design decisions:
- Optional property (defaults to 'task' when undefined) - backward compatible
- Milestone tasks should have startDate === endDate (enforced at API level, not in type)
- Color, progress, accepted properties still apply to milestones
</action>
  <verify>
<automated>grep -n "TaskType.*task.*milestone" /d/Projects/gantt-lib/packages/gantt-lib/src/types/index.ts</automated>
</verify>
  <done>
- TaskType union type defined and exported
- Task interface has optional type property with TaskType type
- TypeScript compilation passes
  </done>
</task>

<task type="auto">
  <name>Task 2: Render diamond shape for milestone tasks in TaskRow</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.tsx</files>
  <action>
Modify TaskRow component to render diamond shape for milestone tasks:

1. **Add milestone detection memo:**
   ```typescript
   const isMilestone = task.type === 'milestone';
   ```

2. **Calculate diamond position:**
   - For milestones: Use `left` from calculateTaskBar() but override width
   - Diamond should be centered on the day column
   - Diamond size: Use dayWidth (or fixed size like 24px)
   - Diamond left position = `left + (width - diamondSize) / 2`

3. **Conditional rendering in JSX (around line 266-298):**
   ```tsx
   {isMilestone ? (
     // Milestone diamond
     <div
       data-taskbar
       className={`gantt-tr-taskBar gantt-tr-milestone ${isDragging ? 'gantt-tr-dragging' : ''} ${task.locked ? 'gantt-tr-locked' : ''}`}
       style={{
         left: `${diamondLeft}px`,
         width: `${diamondSize}px`,
         height: `${diamondSize}px`,
         backgroundColor: barColor,
         ...dragHandleProps.style,
       }}
       onMouseDown={dragHandleProps.onMouseDown}
     />
   ) : (
     // Existing rectangular bar rendering
     <div ...>...</div>
   )}
   ```

4. **Milestone-specific label positioning:**
   - Remove duration label (milestones are always 1 day)
   - Task name appears to the right of diamond (reuse existing right labels)
   - No progress bar for milestones
   - No resize handles for milestones (1-day duration is fixed)

5. **Update arePropsEqual comparison** to include task.type:
   ```typescript
   prevProps.task.type === nextProps.task.type
   ```

Design notes:
- Diamond is a square div rotated 45 degrees via CSS transform
- No resize handles (milestone duration is always 1 day)
- Dragging still works (move milestone to different day)
- Use barColor (task.color or default) for diamond fill
</action>
  <verify>
<automated>grep -n "isMilestone\|gantt-tr-milestone" /d/Projects/gantt-lib/packages/gantt-lib/src/components/TaskRow/TaskRow.tsx</automated>
</verify>
  <done>
- isMilestone computed from task.type
- Conditional rendering: diamond for milestones, rect for tasks
- Diamond centered on day column
- Milestones skip progress bar, resize handles, duration label
- Task.type added to arePropsEqual comparison
  </done>
</task>

<task type="auto">
  <name>Task 3: Add CSS styling for milestone diamond shape</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.css</files>
  <action>
Add milestone diamond styling to TaskRow.css:

1. **Diamond shape using CSS transform:**
   ```css
   .gantt-tr-milestone {
     /* Diamond shape: rotate square 45 degrees */
     transform: translateY(-50%) rotate(45deg);
     /* Keep text rotation separate - handled in parent */
   }

   /* Diamond hover state - same shadow as regular bars */
   .gantt-tr-milestone:hover {
     box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
   }

   /* Diamond dragging state */
   .gantt-tr-milestone.gantt-tr-dragging {
     /* Maintain rotation during drag */
     transform: translateY(-50%) rotate(45deg);
     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
     opacity: 1;
     transition: none !important;
   }
   ```

2. **Ensure milestone labels position correctly:**
   - Task name should appear to the right (reuses existing .gantt-tr-rightLabels)
   - No changes needed to existing label styles

3. **Optional: Add milestone-specific CSS variable for size:**
   ```css
   :root {
     --gantt-milestone-size: 24px;
   }
   ```

Design notes:
- Diamond is created by rotating a square div 45 degrees
- translateY(-50%) centers vertically (same as regular bars)
- Hover and drag states mirror regular bar behavior
- Diamond size can be customized via CSS variable
</action>
  <verify>
<automated>grep -n "gantt-tr-milestone" /d/Projects/gantt-lib/packages/gantt-lib/src/components/TaskRow/TaskRow.css</automated>
</verify>
  <done>
- .gantt-tr-milestone class with 45deg rotation
- Hover state with box-shadow
- Dragging state maintains rotation
- Optional CSS variable for diamond size
  </done>
</task>

<task type="checkpoint:human-verify">
  <name>Task 4: Verify milestone rendering and interaction</name>
  <files>packages/gantt-lib/src/types/index.ts, packages/gantt-lib/src/components/TaskRow/TaskRow.tsx, packages/gantt-lib/src/components/TaskRow/TaskRow.css</files>
  <what-built>
Complete milestone task type implementation:
- Task.type property added to types
- Milestones render as diamond shapes
- Diamonds centered on day column
- Milestones support dragging (not resizing)
- Task names appear to the right of diamonds
  </what-built>
  <how-to-verify>
1. **Visual verification - milestone rendering:**
   - Create a task with `type: 'milestone'` and startDate/endDate on same day
   - Expected: Diamond shape appears centered on the day column
   - Expected: Diamond uses task.color (or default blue)

2. **Label positioning:**
   - Expected: Task name appears to the right of the diamond
   - Expected: No duration label (milestones are always 1 day)
   - Expected: No progress bar or resize handles

3. **Drag interaction:**
   - Drag milestone to a different day
   - Expected: Diamond moves and stays centered on new day
   - Expected: Name label follows the diamond
   - Expected: Cannot resize (no handles, 1-day fixed)

4. **Regular tasks unchanged:**
   - Create regular tasks (no type property or type: 'task')
   - Expected: Render as rectangular bars (existing behavior)
   - Expected: All existing features work (progress, resize, etc.)

5. **Color customization:**
   - Create milestone with custom color
   - Expected: Diamond uses the custom color
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
1. TypeScript compilation passes: `npm run build` in packages/gantt-lib
2. No console errors when rendering milestones
3. Manual verification tests pass (see checkpoint)
4. Regular tasks still render correctly (backward compatibility)
</verification>

<success_criteria>
- Milestone tasks render as diamond shapes centered on day columns
- Diamonds use task color (or default color)
- Milestones display name to the right
- Milestones can be dragged but not resized
- Regular tasks unaffected (backward compatible)
- TaskType exported from index.ts for consumers
</success_criteria>

<output>
After completion, create `.planning/quick/96-1/96-SUMMARY.md`
</output>
