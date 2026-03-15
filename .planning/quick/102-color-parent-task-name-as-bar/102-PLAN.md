---
phase: quick-102
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
autonomous: true
requirements: [QUICK-102]
must_haves:
  truths:
    - "The task name label to the right of the parent bar is rendered in the same color as the bar"
    - "Regular (non-parent) task name labels are unaffected and keep their current blue color"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx"
      provides: "Inline color style on gantt-tr-externalTaskName for parent tasks"
  key_links:
    - from: "isParent flag"
      to: "gantt-tr-externalTaskName span style"
      via: "nameColor computed variable"
      pattern: "isParent.*nameColor"
---

<objective>
Color the task name label (the text to the right of the bar) for parent tasks in the same color as their bar.

Purpose: Visual consistency — parent task names should match the dark bracket bar color rather than the generic blue used for regular tasks.
Output: Modified TaskRow.tsx with inline color on the external task name span for parent rows.
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
  <name>Task 1: Color parent task name to match bar color</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.tsx</files>
  <action>
    In TaskRow.tsx, derive a `nameColor` variable after the existing `barColor` declaration:

    ```ts
    // Color for the external task name label — parent tasks match their bar color
    const nameColor = isParent
      ? (task.color || 'var(--gantt-parent-bar-color, #333333)')
      : undefined; // regular tasks use CSS class color (#2563eb)
    ```

    Then add an inline `style` prop to the `<span className="gantt-tr-externalTaskName">` element:

    ```tsx
    <span
      className="gantt-tr-externalTaskName"
      style={nameColor ? { color: nameColor } : undefined}
    >
      {task.name}
    </span>
    ```

    No CSS changes needed. The existing `.gantt-tr-externalTaskName { color: #2563eb }` rule
    continues to apply for regular tasks (inline style is undefined so no override occurs).
    For parent tasks the inline style wins with the bar color.

    Note: `barColor` is not used here directly because for parent tasks the bar ignores `barColor`
    and uses the CSS variable `--gantt-parent-bar-color` (or `task.color` if set). The `nameColor`
    derivation mirrors the actual parent bar color logic.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npm run typecheck --workspace=packages/gantt-lib 2>/dev/null || npx tsc --noEmit -p packages/gantt-lib/tsconfig.json</automated>
  </verify>
  <done>
    Parent task name labels render in the bar color (#333333 by default, or task.color when set).
    Regular task name labels remain blue (#2563eb). TypeScript compiles without errors.
  </done>
</task>

</tasks>

<verification>
1. Open the gantt demo in the browser.
2. Find a parent task (one with children). Its name label to the right of the bracket bar should be dark (#333333 or matching task.color).
3. Find a regular child task. Its name label should still be blue (#2563eb).
4. If a parent task has a custom color set, the name label should match that custom color.
</verification>

<success_criteria>
- Parent task name labels match their bar color visually.
- Regular task name labels are unchanged.
- No TypeScript errors introduced.
</success_criteria>

<output>
After completion, create `.planning/quick/102-color-parent-task-name-as-bar/102-SUMMARY.md`
</output>
