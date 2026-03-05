---
phase: quick
plan: 059
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
  - packages/gantt-lib/src/hooks/useTaskDrag.ts
autonomous: true
requirements:
  - QUICK-059: Implement FS-like behavior between segments within a task
user_setup: []
must_haves:
  truths:
    - "User can drag any individual segment within a multi-segment task"
    - "Dragging a segment shifts all subsequent segments (followers) by the same delta"
    - "Edge segments (first and last) can be stretched via resize handles"
    - "Middle segments maintain their relative positions to preceding segments"
    - "Gap sizes between segments are preserved during drag operations"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx"
      provides: "Individual segment drag interaction"
      contains: "segment drag handlers"
    - path: "packages/gantt-lib/src/hooks/useTaskDrag.ts"
      provides: "Segment-level drag and cascade logic"
      contains: "segmentCascadeChain calculation"
  key_links:
    - from: "TaskRow.tsx (segment onMouseDown)"
      to: "useTaskDrag.ts"
      via: "segment drag handler"
      pattern: "handleSegmentMouseDown"
    - from: "useTaskDrag.ts (drag calculation)"
      to: "TaskRow.tsx (segment display)"
      via: "segment position overrides"
      pattern: "segmentOverrides.*Map"
---

<objective>
Implement FS-like behavior between segments within a multi-segment task

Purpose: Enable individual segment manipulation while maintaining the logical FS relationship between consecutive segments (each segment starts after the previous one ends)

Output: Segments that can be individually dragged, with followers shifting accordingly, and edge segments resizable
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
@packages/gantt-lib/src/hooks/useTaskDrag.ts
@packages/gantt-lib/src/types/index.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add segment index tracking to useTaskDrag hook</name>
  <files>packages/gantt-lib/src/hooks/useTaskDrag.ts</files>
  <behavior>
    - Test 1: Hook accepts optional segmentIndex parameter
    - Test 2: When segmentIndex is provided, cascade chain includes only subsequent segments (index > segmentIndex)
    - Test 3: Delta calculation works correctly for segment-level drag
  </behavior>
  <action>
    Extend useTaskDrag to support segment-level dragging:

    1. Add optional segmentIndex parameter to UseTaskDragOptions interface:
       ```typescript
       segmentIndex?: number; // Index of segment being dragged (undefined = whole task)
       ```

    2. Add segmentDragInfo to ActiveDragState interface:
       ```typescript
       segmentIndex?: number;
       totalSegments?: number;
       ```

    3. Modify handleGlobalMouseMove to calculate segment cascade:
       - When segmentIndex is defined, only cascade segments with index > segmentIndex
       - Apply same deltaDays to all subsequent segments
       - Preserve gaps between consecutive segments

    4. Update handleMouseDown to accept and store segmentIndex from TaskRow

    Key insight: Segments have implicit FS relationship (seg[i].end < seg[i+1].start)
  </action>
  <verify>
    <automated>npm test -- --testNamePattern="segmentIndex" 2>/dev/null || echo "Tests not yet implemented"</automated>
  </verify>
  <done>useTaskDrag hook accepts and processes segmentIndex parameter for cascade calculations</done>
</task>

<task type="auto">
  <name>Task 2: Enable individual segment drag handles in TaskRow</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.tsx</files>
  <action>
    Modify TaskRow to enable dragging individual segments:

    1. Change onMouseDown binding from only first segment to all segments:
       ```typescript
       onMouseDown={(e) => handleSegmentMouseDown(e, idx)}
       ```

    2. Create handleSegmentMouseDown function that:
       - Calls dragHandleProps.onMouseDown for the specific segment
       - Passes segment index to useTaskDrag via a new prop or callback
       - Calculates initial segment position for drag start

    3. Update dragHandleProps to include segment index:
       - Modify useTaskDrag to accept segmentIndex in options
       - Pass segmentIndex when initializing drag in handleMouseDown

    4. For single-segment tasks (idx === 0 && segments.length === 1):
       - Use existing behavior (whole task drag)

    5. For resize operations:
       - Only first segment can resize-left (stretches gap to next segment)
       - Only last segment can resize-right (stretches gap from previous segment)
       - Middle segments: both resize handles stretch adjacent gaps

    Edge cases:
       - First segment resize-left: shifts entire task (all segments)
       - Last segment resize-right: extends last segment only
       - Middle segment resize: adjusts gap to neighbor segment
  </action>
  <verify>
    <automated>npm run build 2>&1 | grep -i "error\|warning" || echo "Build successful"</automated>
  </verify>
  <done>Each segment in multi-segment task has active drag handle; dragging any segment shifts all followers</done>
</task>

<task type="checkpoint:human-verify">
  <what-built>Complete FS-like segment behavior: individual segment drag with follower cascade, edge segment stretching</what-built>
  <how-to-verify>
    1. Open website demo with multi-segment task
    2. Drag middle segment right → verify all subsequent segments shift equally
    3. Drag first segment left → verify entire task shifts (all segments move)
    4. Resize last segment right → verify only last segment extends, gap preserved
    5. Resize first segment left → verify entire task shifts left
    6. Verify gaps between segments remain constant during drag operations
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues with segment behavior</resume-signal>
</task>

</tasks>

<verification>
- All segments in multi-segment task are individually draggable
- Dragging any segment shifts all subsequent segments by same delta
- First segment drag shifts entire task (backward compatibility)
- Edge segments resizable at outer edges
- Gaps between segments preserved during drag
- No TypeScript errors in build
</verification>

<success_criteria>
Multi-segment tasks behave like a chain of FS-linked tasks:
- Individual segment manipulation possible
- Follower segments shift with dragged segment
- Edge stretching works via resize handles
- Gap consistency maintained
</success_criteria>

<output>
After completion, create `.planning/quick/059-segment-fs-behavior/059-SUMMARY.md`
</output>
