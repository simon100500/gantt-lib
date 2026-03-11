---
phase: quick
plan: 093
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: false
requirements:
  - QUICK-093
user_setup: []

must_haves:
  truths:
    - "Single button appears on hover in name cell (not two buttons)"
    - "Root task shows RIGHT arrow (ChevronRight icon) for demote"
    - "Child task shows LEFT arrow (ChevronLeft icon) for promote"
    - "Button uses lucide-react icons (ChevronLeft, ChevronRight)"
    - "Button disabled when action not available (first row, parent tasks)"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Hierarchy button component with single icon (left OR right)"
      contains: "lucide-react ChevronLeft and ChevronRight icons"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Styling for single hierarchy button"
      contains: ".gantt-tl-action-hierarchy"
  key_links:
    - from: "TaskListRow.tsx hierarchy button"
      to: "onPromoteTask/onDemoteTask callbacks"
      via: "click handler"
      pattern: "handlePromote|handleDemote"
---

<objective>
Replace separate "Повысить" and "Понизить" buttons with a SINGLE button showing EITHER left arrow (for promote) OR right arrow (for demote) using lucide-react icons.

Purpose: Simplify UI for non-multi-level hierarchy - use standard arrow indicators instead of text buttons, reducing visual clutter while maintaining functionality. Only ONE button visible per task, icon changes based on task state.
Output: Single hierarchy button with directional icon that appears on hover.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/092-change-task-grouping/092-SUMMARY.md

# Current implementation (from TaskListRow.tsx lines 55-112)
- HierarchyButton component renders BOTH left and right arrows in a container
- Uses HTML entities `&larr;` and `&rarr;` (not lucide-react icons)
- Disabled arrows are hidden via CSS (`display: none`)
- This is WRONG - user wants ONE button showing EITHER left OR right icon
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix HierarchyButton to show ONE icon (left OR right, not both)</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
    Rewrite the HierarchyButton component (lines 55-112) to:

    1. Import lucide-react icons at top of file:
       ```typescript
       import { ChevronLeft, ChevronRight } from 'lucide-react';
       ```

    2. Replace the entire HierarchyButton component with logic that shows ONE button with ONE icon:
       - If `isChild` is true → show ChevronLeft icon (promote to root)
       - If `isChild` is false and `!isParent && rowIndex > 0` → show ChevronRight icon (demote to child)
       - If neither condition → render nothing (don't show button)

    3. Single button structure:
       ```tsx
       const HierarchyButton: React.FC<HierarchyButtonProps> = ({
         isChild,
         isParent,
         rowIndex,
         onPromote,
         onDemote,
       }) => {
         const canPromote = isChild && onPromote;
         const canDemote = !isParent && onDemote && rowIndex > 0;

         if (!canPromote && !canDemote) {
           return null;
         }

         const handleClick = (e: React.MouseEvent) => {
           e.stopPropagation();
           if (canPromote) {
             onPromote!(e);
           } else if (canDemote) {
             onDemote!(e);
           }
         };

         const title = canPromote
           ? 'Повысить (сделать корневой)'
           : 'Понизить (сделать подчиненной)';

         return (
           <button
             type="button"
             className="gantt-tl-name-action-btn gantt-tl-action-hierarchy"
             onClick={handleClick}
             title={title}
           >
             {canPromote ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
           </button>
         );
       };
       ```

    This ensures:
    - Only ONE button element is rendered (not two separate arrow buttons)
    - Icon changes based on task state (ChevronLeft for children, ChevronRight for roots)
    - Proper lucide-react icon usage with consistent sizing
  </action>
  <verify>
    <automated>MISSING — No automated test exists for UI hierarchy buttons. Manual verification only.</automated>
  </verify>
  <done>
    Single hierarchy button with ONE icon (left OR right) replaces two-arrow implementation
  </done>
</task>

<task type="auto">
  <name>Task 2: Update CSS for single button layout</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
    Simplify the hierarchy button CSS (lines 409-447). Since we now have a single button (not a container with two arrow buttons), update styles to:

    1. Keep `.gantt-tl-action-hierarchy` for the single button:
       ```css
       /* Single hierarchy button with directional arrow */
       .gantt-tl-action-hierarchy {
         width: 20px;
         height: 20px;
         padding: 0;
         display: inline-flex;
         align-items: center;
         justify-content: center;
       }
       ```

    2. REMOVE the following obsolete CSS classes (no longer needed):
       - `.gantt-tl-hierarchy-arrow` (lines 420-447) - we don't have separate arrow buttons anymore

    The single button will inherit base styles from `.gantt-tl-name-action-btn` which already handles:
    - Hover reveal (opacity 0 → 1)
    - Base button styling
    - Transition effects
  </action>
  <verify>
    <automated>MISSING — CSS changes verified visually during manual testing.</automated>
  </verify>
  <done>
    Hierarchy button displays single icon with proper sizing and hover states
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Single hierarchy button with directional icon (ChevronLeft OR ChevronRight) replacing two-arrow implementation
  </what-built>
  <how-to-verify>
    1. Open the Gantt chart application
    2. Create test tasks: Root task 1, Child task (demoted from root), Root task 2
    3. Hover over Child task name:
       - Verify ONLY LEFT ARROW (ChevronLeft icon) appears
       - Click → task becomes root (promoted)
    4. Hover over root task (not first row):
       - Verify ONLY RIGHT ARROW (ChevronRight icon) appears
       - Click → task becomes child of previous (demoted)
    5. Verify first row has NO button (cannot demote)
    6. Verify parent tasks (that are also children) show left arrow
    7. Verify hover-reveal behavior works (button only visible on row hover)
    8. Confirm icons are proper lucide-react icons (not HTML entities)
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- Single button with ONE icon appears on hover in name cell
- Child tasks show ChevronLeft icon (promote to root level)
- Root tasks show ChevronRight icon (demote to child of previous task)
- Only one button element rendered per task (not two separate arrows)
- Proper disabled states: first row shows no button, lucide-react icons used
- Existing promote/demote functionality preserved (smart hierarchy inference from 092 still works)
</verification>

<success_criteria>
- Hierarchy navigation works with single directional icon button
- Visual clutter reduced in task name cell
- All existing hierarchy operations (promote/demote) function identically
</success_criteria>

<output>
After completion, create `.planning/quick/093-promote-demote-to-arrows/093-SUMMARY.md`
</output>
