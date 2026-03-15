---
phase: 98-l
plan: 98
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements:
  - VISUAL-HIERARCHY-INDICATOR
must_haves:
  truths:
    - "Child task rows display an L-shaped corner connector icon before the task name text"
    - "The connector icon is visually subtle (gray, thin) matching tree-view style"
    - "Parent rows are unaffected — no icon shown"
    - "Icon is positioned inside the existing indentation space (no layout shift)"
    - "Editing state (name input active) still works correctly"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "HierarchyConnector SVG component rendered for isChild rows"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "CSS for .gantt-tl-hierarchy-connector positioning"
  key_links:
    - from: "TaskListRow.tsx name cell"
      to: "isChild conditional"
      via: "renders HierarchyConnector SVG before name trigger button"
      pattern: "isChild &&"
---

<objective>
Add a visual hierarchy connector (L-shaped tree connector) inside the name cell of child task rows, positioned before the task name text within the existing indentation space.

Purpose: Make parent-child relationships immediately visible at a glance, like file-tree views (Finder, VS Code, etc.) that show └ connectors for child items.
Output: Child rows show a subtle gray L-corner SVG icon in the left padding area before the task name.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add HierarchyConnector SVG and render for child rows</name>
  <files>
    packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    packages/gantt-lib/src/components/TaskList/TaskList.css
  </files>
  <action>
**In TaskListRow.tsx:**

Add a `HierarchyConnectorIcon` inline SVG component near the other icon components (TrashIcon, PlusIcon, etc.):

```tsx
const HierarchyConnectorIcon = () => (
  <svg
    className="gantt-tl-hierarchy-connector"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Vertical line going down from top to mid, then horizontal to right */}
    <path d="M5 0 L5 10 L14 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Dot at the end of the connector */}
    <circle cx="14" cy="10" r="1.5" fill="currentColor"/>
  </svg>
);
```

Inside the name cell `<div className="gantt-tl-cell gantt-tl-cell-name">`, add this connector icon for child rows. Insert it BEFORE the collapse button / name trigger, as an absolutely-positioned element inside the cell. Place it right after the opening `<div className="gantt-tl-cell gantt-tl-cell-name">`:

```tsx
{isChild && !editingName && <HierarchyConnectorIcon />}
```

The connector must appear when `isChild` is true and name is NOT being edited (to avoid overlap with the edit input — the input already has `padding-left: 24px` which covers the indentation).

**In TaskList.css:**

Add CSS for the connector to position it within the 24px left-padding indentation space of child rows:

```css
/* Hierarchy connector icon — shown in child rows before task name */
.gantt-tl-hierarchy-connector {
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--gantt-grid-line-color, #d1d5db);
  pointer-events: none;
  flex-shrink: 0;
}
```

The icon sits at `left: 4px` which is within the 24px padding space already used by `.gantt-tl-name-trigger-child { padding-left: 24px }`. The name text starts at 24px so the 16px icon fits cleanly in that gap.

Do NOT change any existing padding or layout values. The 24px child indentation is already established and must remain untouched.
  </action>
  <verify>
    <automated>cd /d/Projects/gantt-lib && npm run build --workspace=packages/gantt-lib 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Build succeeds with no TypeScript errors
    - HierarchyConnectorIcon component defined in TaskListRow.tsx
    - `.gantt-tl-hierarchy-connector` CSS class exists in TaskList.css
    - `{isChild && !editingName && &lt;HierarchyConnectorIcon /&gt;}` rendered inside the name cell
  </done>
</task>

</tasks>

<verification>
After the build passes, visually confirm in the browser:
1. Open the gantt chart with at least one parent task that has children
2. Child rows show a subtle gray L-shaped connector in the left area before the task name
3. Parent rows show no connector (only the collapse chevron)
4. Standalone (non-child, non-parent) rows show no connector
5. Double-clicking a child row name to edit: the connector disappears and the input shows normally
</verification>

<success_criteria>
Child task rows display a subtle L-shaped tree connector icon positioned within the existing 24px indentation space, before the task name. No layout shift. No impact on parent rows or editing state. Build passes cleanly.
</success_criteria>

<output>
After completion, create `.planning/quick/98-l/98-SUMMARY.md`
</output>
