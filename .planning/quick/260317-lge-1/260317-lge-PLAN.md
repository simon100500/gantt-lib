---
phase: quick-260317-lge
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: [HIERARCHY-LINES]
must_haves:
  truths:
    - "Every child task at any depth shows a connector (vertical line + horizontal branch + dot) at its nesting level"
    - "Vertical continuation lines are drawn for every ancestor that has more siblings below"
    - "Parent tasks that are also children show both their hierarchy connector AND their collapse chevron"
    - "Last children at any depth show a half-height vertical line (stops at mid-row)"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "Correct ancestorContinuesMap computation"
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Multi-level connector rendering"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Depth-aware connector styles"
  key_links:
    - from: "TaskList.tsx ancestorContinuesMap"
      to: "TaskListRow.tsx ancestorContinues rendering"
      via: "prop passing"
      pattern: "ancestorContinues="
---

<objective>
Fix hierarchy indication elements (vertical lines, connectors) so they display correctly at every nesting level, not just level 1.

Purpose: Currently hierarchy connectors and vertical continuation lines only work for 1-level nesting. Deep nesting (2+) has broken/missing indicators because of a bug in ancestorContinuesMap computation and incomplete rendering logic.
Output: Working tree-style hierarchy indicators at all depth levels with proper vertical continuation lines.
</objective>

<execution_context>
@C:/Users/simon/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/simon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/gantt-lib/src/components/TaskList/TaskList.tsx
@packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@packages/gantt-lib/src/components/TaskList/TaskList.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix ancestorContinuesMap logic and connector rendering for all depths</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx, packages/gantt-lib/src/components/TaskList/TaskListRow.tsx, packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
There are two bugs to fix:

**Bug 1: Wrong ID checked in ancestorContinuesMap (TaskList.tsx ~line 265)**

Current code:
```
continues.unshift(!lastChildIds.has(current.parentId));
```
This checks if the PARENT is a last-child, but it should check if the CURRENT task (the ancestor being walked) is a last child. Fix to:
```
continues.unshift(!lastChildIds.has(current.id));
```
The logic walks from the task upward through ancestors. At each step, we need to know: "does this ancestor continue below?" — meaning "is this ancestor NOT the last child of its parent?". `lastChildIds` contains task IDs of tasks that ARE the last child. So `!lastChildIds.has(current.id)` is correct.

Also remove the `.slice(0, -1)` on line 271 — the direct parent's continuation status IS needed for rendering (it determines whether the vertical line at the deepest ancestor level continues). The current slice removes exactly the information needed for the direct parent level. With the fix to use `current.id`, the array already has the right entries: one per ancestor from outermost to innermost (direct parent). Every entry should be kept.

**Bug 2: Vertical continuation lines in TaskListRow.tsx (~lines 919-935)**

The current code renders continuation lines from `ancestorContinues` array. After fixing Bug 1, each entry in `ancestorContinues` corresponds to an ancestor level (index 0 = outermost ancestor, last index = direct parent). The vertical lines should render at the correct horizontal offset for each depth level.

Current positioning: `left: ${idx * 20 + 9}px` — this puts the line at `9, 29, 49, ...` px.
The connector icon is at `(nestingDepth - 1) * 20 + 4` px (left edge) and the vline inside it is at +5px = `(nestingDepth - 1) * 20 + 9` px.

So the continuation line at index `idx` should be at depth `idx + 1` (since index 0 = depth-1 ancestor). The horizontal position should be `idx * 20 + 9` px — this already matches. Verify this is correct after removing the slice.

Actually, with the slice removed, the array will have one MORE entry (the direct parent level). We need continuation lines for ALL ancestor levels EXCEPT the current task's own level (which is handled by the HierarchyConnectorIcon). The array now covers depths 1 through nestingDepth (one entry per ancestor). The HierarchyConnectorIcon handles the connector at the task's own level. The continuation lines handle ALL the ancestor levels.

Wait — after removing slice, for a depth-2 task:
- Walk: current=task(d2), push !lastChildIds.has(task.id)... No, current starts as the task, and we push on current.id while current has parentId.

Let me re-trace with the fix:
```
current = task (depth 2), has parentId
  continues.unshift(!lastChildIds.has(current.id))  // is task the last child?
  current = parent (depth 1), has parentId
  continues.unshift(!lastChildIds.has(parent.id))  // is parent the last child?
  current = grandparent (depth 0), no parentId -> stop
continues = [!lastChildIds.has(parent), !lastChildIds.has(task)]
```

Without slice, this has 2 entries for a depth-2 task. Entry 0 = "does the depth-1 parent continue?", Entry 1 = "does the task itself continue?".

But the task's own continuation is shown by HierarchyConnectorIcon (isLastChild prop). So we should STILL slice off the last entry. Keep `continues.slice(0, -1)`.

Actually no — the HierarchyConnectorIcon shows the connector at the task's own depth. But we need the vertical CONTINUATION line at the task's direct parent's depth... Let me think again.

The vertical continuation lines show where ancestor tree branches continue. For each ancestor of the current task, if that ancestor has more siblings below, we draw a vertical line at that ancestor's indentation level. This is standard tree rendering.

For a depth-2 task with ancestors at depth 0 (root GP) and depth 1 (parent P):
- If P is not the last child of GP -> draw vertical line at depth 1 position
- The task's own connector (HierarchyConnectorIcon) handles the depth-2 position

So we need continuation info for the PARENT (depth 1), not for the task itself. The array after fix (without slice) has entries for both parent and task. We need to slice off the last (task's own) entry. So KEEP the `.slice(0, -1)`.

For a depth-3 task with GP(d0), P(d1), PP(d2):
- Need continuation for P(d1) and PP(d2)
- HierarchyConnectorIcon handles d3
- Array without slice: [!lastChild(P), !lastChild(PP), !lastChild(task)]
- With slice: [!lastChild(P), !lastChild(PP)] -- correct!

So the fix is:
1. Change `!lastChildIds.has(current.parentId)` to `!lastChildIds.has(current.id)` on line 265
2. KEEP the `.slice(0, -1)` on line 271

**Bug 3: Vertical lines also need to show on parent rows that are children**

Currently (line 917): `{isChild && !editingName && ( ... )}` — this block renders connectors. But look at `isParent` block (line 941): it only renders the collapse button, NOT the continuation lines.

A task that is BOTH a parent AND a child (mid-level node) shows the collapse button but NOT the ancestor continuation vertical lines. This means for a grandchild looking up, the continuation lines from its grandparent level are missing on its parent row.

Fix: The ancestor continuation vertical lines (the `ancestorContinues.map(...)` block, lines 919-935) should render for ALL tasks that have `nestingDepth > 0`, not just `isChild` tasks. However, this map block is currently inside the `{isChild && ...}` conditional.

Restructure:
- Move the `ancestorContinues.map(...)` rendering OUTSIDE the `isChild` conditional, so it renders whenever `nestingDepth > 0 && !editingName`.
- Keep the `HierarchyConnectorIcon` inside `isChild` (only leaf children and mid-level children show the branch connector).
- Actually, parent-children (mid-level nodes) should also show the connector. A task that is `isChild` (has parentId) should ALWAYS show the connector, regardless of whether it's also a parent. Check that `isChild` is true for parent-children — yes, `isChild = task.parentId !== undefined` (line 518). So `isChild` is true for mid-level nodes too.

The real issue: for parent rows, the collapse button is at `nestingDepth * 20 + 4` and the connector is at `(nestingDepth - 1) * 20 + 4`. They don't overlap. But visually the collapse button may hide the connector dot. That's OK — the connector shows the branch from above, and the collapse button replaces the dot.

After restructuring, every row with `nestingDepth > 0` should render:
1. Ancestor continuation vertical lines (from ancestorContinues)
2. The HierarchyConnectorIcon (if isChild, which all nestingDepth > 0 tasks are)
3. The collapse button (if isParent)

**Summary of changes:**

In `TaskList.tsx` line 265, change:
```typescript
continues.unshift(!lastChildIds.has(current.parentId));
```
to:
```typescript
continues.unshift(!lastChildIds.has(current.id));
```

In `TaskListRow.tsx`, ensure the ancestor continuation lines render for parent-child rows too. The current `{isChild && !editingName && (...)}` block already works because `isChild` is true for tasks with parentId (including mid-level parents). Verify this renders correctly.

Test with the demo app by creating a 3+ level hierarchy and verifying:
- Vertical continuation lines appear at all ancestor levels
- Last children show half-height vertical lines
- Mid-level parent rows show continuation lines from their ancestors
  </action>
  <verify>
    <automated>cd D:/Проекты/gantt-lib && npx tsup 2>&1 | tail -5</automated>
  </verify>
  <done>
    - Hierarchy vertical continuation lines render at every nesting level, not just level 1
    - The connector (vline + hline + dot) appears on all child tasks regardless of depth
    - Parent rows that are also children show ancestor continuation lines
    - Last children at any depth show half-height vertical lines correctly
    - Build succeeds without errors
  </done>
</task>

</tasks>

<verification>
- Build succeeds: `npx tsup` exits cleanly
- Visual check: Open demo app, create tasks at 3+ nesting levels, confirm vertical lines appear at all levels
- Verify last-child half-height lines work at depth 2 and 3
</verification>

<success_criteria>
- Every child task at any depth displays proper tree-style hierarchy indicators
- Vertical continuation lines correctly show which ancestor branches continue
- No regression in existing depth-1 hierarchy display
</success_criteria>

<output>
After completion, create `.planning/quick/260317-lge-1/260317-lge-SUMMARY.md`
</output>
