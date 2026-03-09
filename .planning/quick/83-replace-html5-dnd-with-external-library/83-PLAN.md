---
phase: quick
plan: 83
type: execute
wave: 1
depends_on: []
files_modified: [packages/gantt-lib/src/components/TaskList/TaskList.tsx, packages/gantt-lib/src/components/TaskList/TaskListRow.tsx, packages/gantt-lib/package.json]
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - User can drag task list rows to reorder them
    - Drag handle appears on hover over the number cell
    - Visual feedback shows drag indicator line during drag
    - Dragged row has blue text during drag operation
    - Drop position indicator appears above/below rows
    - onReorder callback fires with reordered tasks array
    - All existing logic preserved (same behavior, different implementation)
  artifacts:
    - path: packages/gantt-lib/src/components/TaskList/TaskList.tsx
      provides: Main drag state management with external library
      contains: drag handlers from external library
    - path: packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
      provides: Row-level drag integration
      contains: drag handle and drag preview
    - path: packages/gantt-lib/package.json
      provides: External drag-and-drop library dependency
      contains: new drag library in dependencies
  key_links:
    - from: TaskListRow (drag handle)
      to: TaskList (drag state)
      via: library drag events
      pattern: external library event handlers
    - from: external library
      to: onReorder callback
      via: drag completion handler
      pattern: library onEnd callback
---

<objective>
Replace HTML5 drag-and-drop with external library (@dnd-kit/core) while preserving all existing drag-to-reorder logic.

Purpose: External library provides better touch support, more reliable drag behavior, and cleaner API than HTML5 drag-and-drop.
Output: Task list reordering works identically but uses @dnd-kit instead of HTML5 drag events.
</objective>

<execution_context>
@D:/Projects/gantt-lib/.planning/quick/83-replace-html5-dnd-with-external-library

# Context from current implementation
@packages/gantt-lib/src/components/TaskList/TaskList.tsx
@packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
</execution_context>

<context>
# Current Implementation (HTML5 Drag-and-Drop)

The task list reordering currently uses HTML5 drag-and-drop API:
- `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd` events
- `dataTransfer.effectAllowed = 'move'`
- `dragOriginIndexRef` to track original position
- `draggingIndex` and `dragOverIndex` state for visual feedback
- Complex drop logic to handle insert position calculation

# Current Behavior to Preserve

1. Drag handle appears on hover over the number cell
2. Clicking drag handle initiates drag
3. Dragging row has blue text color
4. Drag indicator line appears above/below target row
5. Drop logic correctly calculates insert position for both drag-up and drag-down
6. onReorder callback fires with reordered tasks array
7. No-op for same position drops
8. Escape key cancels drag

# External Library: @dnd-kit/core

@dnd-kit/core is chosen because:
- Lightweight (~15KB) compared to react-dnd (50KB+)
- Better touch support than HTML5 drag-and-drop
- Clean API with sensors system
- Accessibility support built-in
- Active maintenance
- Works well with React 19

Key concepts:
- `DndContext` - wrapper component that manages drag state
- `useDraggable` - hook for draggable items
- `useDroppable` - hook for drop targets (or use sortable for lists)
- `PointerSensor` - unified pointer events (mouse + touch)
- `DragOverlay` - custom drag preview
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install @dnd-kit/core and @dnd-kit/sortable dependencies</name>
  <files>packages/gantt-lib/package.json</files>
  <action>
    Install @dnd-kit/core and @dnd-kit/sortable packages:
    ```bash
    cd packages/gantt-lib && pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
    ```

    These packages provide:
    - @dnd-kit/core: Core drag-and-drop functionality
    - @dnd-kit/sortable: Specialized hooks for sortable lists (arrayCollision, sortableKeyboardCoordinates)
    - @dnd-kit/utilities: Helper utilities (CSS transform bridge, array movement)
  </action>
  <verify>grep -E "@dnd-kit/(core|sortable|utilities)" packages/gantt-lib/package.json</verify>
  <done>@dnd-kit packages are listed in package.json dependencies</done>
</task>

<task type="auto">
  <name>Task 2: Replace HTML5 drag-and-drop with @dnd-kit/sortable in TaskList</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx, packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
    Replace HTML5 drag events with @dnd-kit/sortable implementation.

    **In TaskList.tsx:**
    1. Add imports:
       ```typescript
       import {
         DndContext,
         closestCenter,
         KeyboardSensor,
         PointerSensor,
         useSensor,
         useSensors,
         DragStartEvent,
         DragOverEvent,
         DragEndEvent,
       } from '@dnd-kit/core';
       import {
         arrayMove,
         SortableContext,
         sortableKeyboardCoordinates,
         verticalListSortingStrategy,
       } from '@dnd-kit/sortable';
       ```

    2. Remove HTML5 drag state:
       - Remove `draggingIndex`, `dragOverIndex`, `dragOriginIndexRef`
       - Remove `handleDragStart`, `handleDragOver`, `handleDrop`, `handleDragEnd`

    3. Add @dnd-kit sensors and state:
       ```typescript
       const [activeId, setActiveId] = useState<string | null>(null);

       const sensors = useSensors(
         useSensor(PointerSensor, {
           activationConstraint: {
             distance: 5, // 5px movement required to start drag (prevents accidental drags)
           },
         }),
         useSensor(KeyboardSensor, {
           coordinateGetter: sortableKeyboardCoordinates,
         })
       );

       const handleDragStart = useCallback((event: DragStartEvent) => {
         setActiveId(event.active.id as string);
       }, []);

       const handleDragOver = useCallback((event: DragOverEvent) => {
         const { active, over } = event;
         if (over && active.id !== over.id) {
           const oldIndex = tasks.findIndex(t => t.id === active.id);
           const newIndex = tasks.findIndex(t => t.id === over.id);
           // Preview only - don't update tasks yet
           setDragOverIndex(newIndex);
         }
       }, [tasks]);

       const handleDragEnd = useCallback((event: DragEndEvent) => {
         const { active, over } = event;
         setActiveId(null);
         setDragOverIndex(null);

         if (over && active.id !== over.id) {
           const oldIndex = tasks.findIndex(t => t.id === active.id);
           const newIndex = tasks.findIndex(t => t.id === over.id);
           const reordered = arrayMove(tasks, oldIndex, newIndex);
           onReorder?.(reordered);
           onTaskSelect?.(active.id as string);
         }
       }, [tasks, onReorder, onTaskSelect]);
       ```

    4. Wrap task rows in DndContext and SortableContext:
       ```typescript
       return (
         <div className="gantt-tl-overlay">
           <div className="gantt-tl-table">
             {/* ... header ... */}
             <DndContext
               sensors={sensors}
               collisionDetection={closestCenter}
               onDragStart={handleDragStart}
               onDragOver={handleDragOver}
               onDragEnd={handleDragEnd}
             >
               <SortableContext
                 items={tasks.map(t => t.id)}
                 strategy={verticalListSortingStrategy}
               >
                 <div className="gantt-tl-body" style={{ height: `${totalHeight}px` }}>
                   {tasks.map((task, index) => (
                     <TaskListRow
                       key={task.id}
                       // ... existing props ...
                       isDragging={activeId === task.id}
                     />
                   ))}
                 </div>
               </SortableContext>
             </DndContext>
           </div>
         </div>
       );
       ```

    **In TaskListRow.tsx:**
    1. Add imports:
       ```typescript
       import { useSortable } from '@dnd-kit/sortable';
       import { CSS } from '@dnd-kit/utilities';
       ```

    2. Replace HTML5 drag props with useSortable:
       ```typescript
       const {
         attributes,
         listeners,
         setNodeRef,
         transform,
         transition,
         isDragging,
       } = useSortable({ id: task.id });
       ```

    3. Update row div to use sortable refs and styles:
       ```typescript
       return (
         <div
           ref={setNodeRef}
           style={{
             transform: CSS.Transform.toString(transform),
             transition,
             opacity: isDragging ? 0.5 : 1,
           }}
           className={`gantt-tl-row ${isDragging ? 'gantt-tr-dragging' : ''} ${selected ? 'selected' : ''}`}
         >
           {/* Number cell with drag handle */}
           <div className="gantt-tl-cell gantt-tl-cell-number">
             <button
               className="gantt-tl-drag-handle"
               {...attributes}
               {...listeners}
             >
               {rowIndex + 1}
             </button>
           </div>
           {/* ... rest of row cells ... */}
         </div>
       );
       ```

    4. Remove all HTML5 drag attributes:
       - Remove `draggable={true}`
       - Remove `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd` props
       - Remove drag handle `onMouseDown` logic (now handled by {...listeners})

    **CSS Updates (TaskList.css):**
    Keep existing drag handle styles but ensure they work with @dnd-kit:
    - `.gantt-tl-drag-handle` should have `cursor: grab`
    - `.gantt-tl-drag-handle:active` should have `cursor: grabbing`
    - Remove any HTML5 drag-specific styles

    **Important: Preserve all existing logic:**
    - Same visual feedback (blue text during drag)
    - Same drag indicator positioning
    - Same drop behavior (arrayMove preserves this)
    - Same no-op for same position (handled by @dnd-kit's active.id !== over.id check)
    - Same onReorder callback signature
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npm test 2>&1 | head -20</automated>
  </verify>
  <done>
    - @dnd-kit manages drag state instead of HTML5 drag events
    - TaskListRow uses useSortable hook
    - All drag behavior preserved (visual feedback, drop logic, callbacks)
    - TypeScript compiles without errors
  </done>
</task>

<task type="checkpoint:human-verify">
  <name>Task 3: Verify drag-to-reorder works with @dnd-kit</name>
  <what-built>Task list reordering using @dnd-kit/sortable instead of HTML5 drag-and-drop</what-built>
  <how-to-verify>
    1. Start dev server: `cd packages/gantt-lib && npm run dev`
    2. Open demo page
    3. Hover over task list number cell - drag handle should appear
    4. Click and drag a task row - row should become draggable with blue text
    5. Drag to a new position - indicator line should show drop position
    6. Release to drop - task should move to new position
    7. Verify onReorder callback fires (check demo console/logs)
    8. Test dragging up (row index decreases)
    9. Test dragging down (row index increases)
    10. Test same-position drop (no change)
    11. Test Escape key during drag (should cancel)
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
1. @dnd-kit packages installed correctly
2. TaskList uses DndContext and SortableContext
3. TaskListRow uses useSortable hook
4. Drag handle appears on hover and works with pointer events
5. Visual feedback (blue text, drag indicator) preserved
6. Drop logic produces correct reordered array
7. onReorder callback signature unchanged
8. TypeScript compilation succeeds
9. No console errors during drag operations
</verification>

<success_criteria>
- Task list rows can be reordered via drag-and-drop
- Visual feedback matches original implementation
- All existing drag logic preserved (same behavior, different implementation)
- Touch devices can drag rows (pointer events support both mouse and touch)
- No bundle size regression (@dnd-kit adds ~15KB, acceptable for better UX)
</success_criteria>

<output>
After completion, create `.planning/quick/83-replace-html5-dnd-with-external-library/83-SUMMARY.md`
</output>
