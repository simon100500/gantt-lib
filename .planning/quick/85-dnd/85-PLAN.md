---
phase: quick-85
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: false
requirements: []
user_setup: []
must_haves:
  truths:
    - User can drag a task and drop it after the last row
    - Blue drop indicator appears when hovering over the drop zone after the last row
    - Task is correctly placed at the end when dropped in the after-last zone
  artifacts:
    - path: packages/gantt-lib/src/components/TaskList/TaskList.tsx
      provides: Drag/drop logic with after-last drop zone
      contains: handleDragOver, handleDrop, dragOverIndex state
    - path: packages/gantt-lib/src/components/TaskList/TaskList.css
      provides: Drop zone styling
      contains: .gantt-tl-drop-zone, .gantt-tl-drop-zone-drag-over
  key_links:
    - from: TaskList.tsx
      to: TaskList.css
      via: CSS class names for drop zone
      pattern: gantt-tl-drop-zone
---

<objective>
Fix drag and drop to allow moving tasks to the very end (after the last row)

Purpose: The current DnD separator only appears between existing rows, preventing users from dropping a task after the last row. This fix adds a drop zone at the end to enable placing tasks at the end position.

Output: Users can now drag tasks to any position including the very end of the list
</objective>

<execution_context>
@D:/Projects/gantt-lib/.planning/quick/85-dnd

# Only reference prior plan SUMMARYs if genuinely needed
@packages/gantt-lib/src/components/TaskList/TaskList.tsx
@packages/gantt-lib/src/components/TaskList/TaskList.css
</execution_context>

<context>
# Current Drag/Drop Implementation

From TaskList.tsx (lines 227-276):
```typescript
// Drag-to-reorder state
const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
const dragOriginIndexRef = useRef<number | null>(null);

const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  setDragOverIndex(index);
}, []);

const handleDrop = useCallback((dropIndex: number, e: React.DragEvent) => {
  e.preventDefault();
  const originIndex = dragOriginIndexRef.current;
  if (originIndex === null || originIndex === dropIndex) {
    setDraggingIndex(null);
    setDragOverIndex(null);
    dragOriginIndexRef.current = null;
    return;
  }
  const reordered = [...tasks];
  const [moved] = reordered.splice(originIndex, 1);
  const insertIndex = originIndex < dropIndex ? dropIndex - 1 : dropIndex;
  reordered.splice(insertIndex, 0, moved);
  onReorder?.(reordered);
  onTaskSelect?.(moved.id);
  setDraggingIndex(null);
  setDragOverIndex(null);
  dragOriginIndexRef.current = null;
}, [tasks, onReorder, onTaskSelect]);
```

The issue: `dragOverIndex` is only set when hovering over rows 0 to tasks.length-1. There's no way to represent dropping after the last row (index = tasks.length).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add drop zone element after the last row</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx</files>
  <action>
    Add a drop zone div after the task rows (inside .gantt-tl-body, after the tasks.map()):

    1. Add the drop zone div with:
       - className="gantt-tl-drop-zone"
       - style={{ height: `${rowHeight}px` }}
       - onDragOver handler for when hovering the after-last zone
       - onDrop handler for dropping in the after-last zone
       - Conditionally show .gantt-tl-drop-zone-drag-over class when dragOverIndex === tasks.length

    2. The onDragOver should set dragOverIndex to tasks.length (a special value meaning "after last")
    3. The onDrop should call handleDrop with tasks.length as the drop index
  </action>
  <verify>
    <automated>MISSING — quick task without automated test</automated>
  </verify>
  <done>Drop zone element renders after all rows with proper drag handlers</done>
</task>

<task type="auto">
  <name>Task 2: Update drop logic to handle after-last position</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx</files>
  <action>
    Modify handleDrop to correctly handle the case where dropIndex === tasks.length:

    Current logic:
    ```typescript
    const insertIndex = originIndex < dropIndex ? dropIndex - 1 : dropIndex;
    ```

    When dropIndex === tasks.length (after last):
    - originIndex < tasks.length is always true (originIndex is always < tasks.length)
    - insertIndex = tasks.length - 1 (last position) - CORRECT

    However, verify the logic handles edge cases:
    - Dragging last row to after-last position: originIndex = tasks.length - 1, dropIndex = tasks.length
      - insertIndex = tasks.length - 1 - 1 = tasks.length - 2 (WRONG!)

    Fix: When dropIndex === tasks.length, always insert at tasks.length - 1 (last position):
    ```typescript
    const insertIndex = dropIndex === tasks.length
      ? tasks.length - 1  // After last means position at last
      : originIndex < dropIndex ? dropIndex - 1 : dropIndex;
    ```
  </action>
  <verify>
    <automated>MISSING — quick task without automated test</automated>
  </verify>
  <done>handleDrop correctly places task at end when dropIndex === tasks.length</done>
</task>

<task type="auto">
  <name>Task 3: Add CSS styling for the drop zone indicator</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
    Add CSS for the drop zone element to show the blue indicator when dragging over the after-last zone:

    ```css
    /* Drop zone after last row - allows placing tasks at the very end */
    .gantt-tl-drop-zone {
      position: relative;
      width: 100%;
      pointer-events: none; /* Let events pass through when not dragging */
    }

    /* Show blue top border when dragging over the after-last zone */
    .gantt-tl-drop-zone-drag-over {
      pointer-events: auto; /* Accept drop events when dragging */
    }

    .gantt-tl-drop-zone-drag-over::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background-color: #3b82f6;
      z-index: 1;
    }
    ```

    Also update the existing .gantt-tl-row-drag-over::before to match this style for consistency.
  </action>
  <verify>
    <automated>MISSING — quick task without automated test</automated>
  </verify>
  <done>Blue indicator appears at bottom when hovering over drop zone after last row</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Complete fix for dragging tasks to the end of the list</what-built>
  <how-to-verify>
    1. Start the development server
    2. Open the gantt chart with at least 3 tasks
    3. Drag the first task by its drag handle (number column)
    4. Drag it to the bottom, past the last row
    5. Observe the blue separator line appears at the bottom
    6. Drop the task
    7. Verify the task is now at the end of the list
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
Manual verification of drag and drop functionality:
1. Dragging a task to any middle position works
2. Dragging a task to the very end (after last row) shows blue indicator
3. Dropping at the end places the task at the last position
4. Dragging the last task to after-last position keeps it at the end (no-op)
</verification>

<success_criteria>
- Tasks can be dragged and dropped after the last row
- Blue drop indicator appears when hovering over the drop zone at the end
- Tasks are correctly positioned at the end when dropped
- Existing drag and drop behavior for middle positions is not affected
</success_criteria>

<output>
After completion, create `.planning/quick/85-dnd/quick-85-01-SUMMARY.md`
</output>
