---
phase: quick-14
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - "Dependencies can render bidirectionally based on task order"
    - "Parent task appears after child task: arrow points DOWN"
    - "Parent task appears before child task: arrow points UP"
    - "Lines connect from correct edge (top/bottom) based on ordering"
    - "Arrowheads correctly orient for up and down connections"
  artifacts:
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx"
      provides: "Task position calculation with bidirectional exit/entry"
      min_lines: 60
    - path: "packages/gantt-lib/src/utils/geometry.ts"
      provides: "calculateTaskBar function for positioning"
      contains: "calculateTaskBar function"
  key_links:
    - from: "DependencyLines.tsx"
      to: "geometry.ts"
      via: "calculateTaskBar() and calculateOrthogonalPath()"
      pattern: "calculateTaskBar\(|calculateOrthogonalPath\(from, to\)"
---

<objective>
Enable bidirectional dependency line rendering based on task order (parent after child → up arrow, parent before child → down arrow)

Purpose: Support task ordering where child tasks appear above parent tasks, with visual connections pointing in the correct direction

Output: Updated DependencyLines component with bidirectional edge calculation
</objective>

<execution_context>
@D:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@D:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@D:\Projects\gantt-lib\.planning\STATE.md

Current Implementation Analysis:
- DependencyLines.tsx calculates exitY from bottom (rowTop + rowHeight - 10)
- EntryY is always top of bar (rowTop + 4)
- calculateOrthogonalPath assumes down direction (ty > fy)
- Arrowheads always point in one direction
</context>

<tasks>

<task type="auto">
  <name>Update task position calculation with bidirectional exit/entry points</name>
  <files>packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx</files>
  <action>
    Modify the taskPositions useMemo to calculate two sets of edge points based on task ordering:

    1. Add reverseOrder flag: task.index < dependency.taskId.index
    2. For reverse ordering (parent after child):
       - exitY = rowTop + 4 (top edge, leaving UP)
       - entryY = rowTop + rowHeight - 10 (bottom edge, arriving from DOWN)
    3. For normal ordering (parent before child):
       - exitY = rowTop + rowHeight - 10 (bottom edge, leaving DOWN)
       - entryY = rowTop + 4 (top edge, arriving from UP)

    Reference existing code:
    - Current exitY: rowTop + rowHeight - 10 (line 52)
    - Current entryY: rowTop + 4 (line 53)

    Must NOT modify:
    - calculateOrthogonalPath (logic is correct for path shape)
    - Arrow marker rendering (will adapt automatically via path direction)
  </action>
  <verify>
    1. Run dev server: npm run dev
    2. Create test case with reversed task order in dependencies array:
       - task-3 (index 0) depends on task-2 (index 1)
       - This creates parent-after-child scenario
    3. Verify arrow points UP (from child to parent)
    4. Verify arrow points DOWN for normal ordering
  </verify>
  <done>Dependency lines correctly render bidirectional arrows based on task ordering</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Bidirectional dependency line rendering in worktree branch</what-built>
  <how-to-verify>
    1. Checkout worktree branch if needed:
       ```bash
       git worktree list
       git worktree use workterr
       npm run dev
       ```

    2. Open browser to http://localhost:3000 and scroll to "Task Dependencies" section

    3. Test reversed ordering:
       - Find task-3 (Feb 7-9) which has dependency on task-2 (Feb 4-6)
       - Arrow should point UP from task-2 to task-3
       - Visual confirmation: line originates from TOP edge of task-2, terminates at TOP edge of task-3

    4. Test normal ordering:
       - Find task-1 (Feb 1-3) to task-2 (Feb 4-6)
       - Arrow should point DOWN from task-1 to task-2
       - Visual confirmation: line originates from BOTTOM edge of task-1, terminates at BOTTOM edge of task-2

    5. Test edge cases:
       - Same row connections should still work correctly
       - Multi-row connections should maintain correct direction
       - Circular dependencies (task-3 on task-2, task-2 on task-3) should remain red
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues found</resume-signal>
</task>

</tasks>

<verification>
Visual verification required:
- Bidirectional arrows (up and down) render correctly
- Edge points match expected edges (top/bottom based on ordering)
- Arrowheads orient correctly
- No visual glitches or missing lines
</verification>

<success_criteria>
- Bidirectional dependency rendering working
- Reversed task ordering displays up-pointing arrows
- Normal task ordering displays down-pointing arrows
- All existing functionality preserved (circular detection, lag support, etc.)
</success_criteria>

<output>
After completion, create `.planning/quick/14-worktree-workterr/14-SUMMARY.md`
</output>
