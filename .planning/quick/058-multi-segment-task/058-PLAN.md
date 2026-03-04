---
phase: quick
plan: 058
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/types/index.ts
  - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
  - packages/gantt-lib/src/components/TaskRow/TaskRow.css
autonomous: true
requirements: []
user_setup: []
must_haves:
  truths:
    - "Single task can display multiple bar segments in one row"
    - "Each segment has its own startDate/endDate"
    - "Segments are visually separated with gaps between them"
    - "Task name and labels shown once per row (not per segment)"
    - "Progress and styling apply to all segments"
  artifacts:
    - path: "packages/gantt-lib/src/types/index.ts"
      provides: "TaskSegment interface and segments array in Task"
      contains: "TaskSegment"
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx"
      provides: "Multi-segment rendering logic"
      contains: "segments.map"
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.css"
      provides: "Multi-segment visual styles"
  key_links:
    - from: "TaskRow.tsx"
      to: "Task segments"
      via: "task.segments?.map() || fallback to single bar"
      pattern: "segments.*map"
    - from: "GanttChart.tsx"
      to: "Task.type"
      via: "Type extension for segments property"
---

<objective>
Add support for multiple task bar segments in a single task row.

Purpose: Support intermittent work execution where a single task has multiple execution periods (segments) in one row, rather than creating separate tasks. This represents stages of executing one work with gaps between active periods.

Output: Task can have optional `segments` array with multiple {startDate, endDate} periods, rendered as separate bars in the same row.
</objective>

<execution_context>
@D:/Projects/gantt-lib/.planning/STATE.md
@D:/Projects/gantt-lib/packages/gantt-lib/src/types/index.ts
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
</execution_context>

<context>
# Current Task Model
```typescript
export interface Task {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  color?: string;
  progress?: number;
  accepted?: boolean;
  dependencies?: TaskDependency[];
  locked?: boolean;
  divider?: 'top' | 'bottom';
}
```

# Current TaskRow Rendering
- Single task bar per row positioned using `calculateTaskBar(taskStartDate, taskEndDate, monthStart, dayWidth)`
- Task name, progress, duration labels rendered once
- Progress bar fills entire task bar width

# Requirement (from user description)
"попробуй изменить модель и добавить в одну строку несколько полос. это именно связано с прерывистым выполнением работ, а не разными роаботами. то есть это этапы выполнения одной работы. по поводу связей - они будут связаны только началом и концом."

Translation: "Try changing the model and adding multiple bars to one row. This is specifically related to intermittent execution of work, not different works. That is, these are stages of executing one work. Regarding connections - they will be connected only by start and end."
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add TaskSegment type to Task interface</name>
  <files>packages/gantt-lib/src/types/index.ts</files>
  <action>
Add new TaskSegment interface and extend Task with optional segments array:

```typescript
/**
 * Single work segment for tasks with intermittent execution
 * Multiple segments can be defined in Task.segments array
 */
export interface TaskSegment {
  /** Segment start date (ISO string or Date object) */
  startDate: string | Date;
  /** Segment end date (ISO string or Date object) */
  endDate: string | Date;
}
```

Then extend Task interface to add optional segments property:

```typescript
export interface Task {
  // ... existing properties ...
  /**
   * Optional array of work segments for intermittent execution.
   * When defined, renders multiple bars in the same row.
   * If segments is empty/undefined, falls back to startDate/endDate for single bar.
   */
  segments?: TaskSegment[];
}
```

Keep existing startDate/endDate for backward compatibility and as fallback.
Do NOT change GanttChart.tsx Task interface (it re-exports from types/index.ts).
</action>
  <verify>
grep -n "TaskSegment" packages/gantt-lib/src/types/index.ts
grep -n "segments\?" packages/gantt-lib/src/types/index.ts
</verify>
  <done>TaskSegment interface defined, Task has optional segments array, TypeScript compiles without errors</done>
</task>

<task type="auto">
  <name>Task 2: Update TaskRow to render multiple segments</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.tsx</files>
  <action>
Modify TaskRow to support multi-segment rendering:

1. Add useMemo to derive segments array from task:
```typescript
const segments = useMemo(() => {
  if (task.segments && task.segments.length > 0) {
    return task.segments.map(seg => ({
      startDate: parseUTCDate(seg.startDate),
      endDate: parseUTCDate(seg.endDate)
    }));
  }
  // Fallback to single segment from task dates
  return [{ startDate: taskStartDate, endDate: taskEndDate }];
}, [task.segments, taskStartDate, taskEndDate]);
```

2. Update task bar rendering to map over segments:
```tsx
{segments.map((seg, idx) => {
  const { left, width } = calculateTaskBar(seg.startDate, seg.endDate, monthStart, dayWidth);
  return (
    <div
      key={`segment-${idx}`}
      className="gantt-tr-taskBar gantt-tr-taskSegment"
      style={{
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: barColor,
        // ... other styles
      }}
    >
      {/* Progress bar (same for all segments) */}
      {/* Duration label */}
      {/* Resize handles (only on first segment?) */}
    </div>
  );
})}
```

3. Move task name labels OUTSIDE the segment map - render once per row, not per segment. The labels should use the overall task dates (min start, max end) for positioning.

4. Consider drag/resize behavior with segments:
   - For now, disable drag on multi-segment tasks (locked=true behavior)
   - Or: only allow dragging the first segment, others follow
   - Implementation detail: useTaskDrag hook called only if segments.length === 1

5. Update duration label logic: show each segment's duration on its bar

Do NOT modify CSS yet (that's Task 3).
</action>
  <verify>
grep -n "segments.map" packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
npm run build 2>&1 | head -20
</verify>
  <done>TaskRow renders multiple segments, task name shown once, TypeScript compiles</done>
</task>

<task type="auto">
  <name>Task 3: Add CSS for multi-segment styling</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.css</files>
  <action>
Add CSS for multi-segment visual styling:

1. Add class for segment bars (already have gantt-tr-taskSegment in TaskRow.tsx):
```css
/* Multi-segment task bars */
.gantt-tr-taskSegment {
  /* Inherits all gantt-tr-taskBar styles */
  /* Additional gap handling can go here */
}
```

2. Optional: Add subtle visual distinction for multi-segment tasks:
- Slight rounded corners on each segment
- Consistent gap between segments (automatic based on date range)

3. Ensure left labels (date labels) position correctly with multiple segments:
- Should position at the leftmost segment start
- Use existing gantt-tr-leftLabels positioning

4. Ensure right labels (task name) position correctly:
- Should position at the rightmost segment end
- Use existing gantt-tr-rightLabels positioning

No special "gap" CSS needed - gaps are natural from date ranges between segments.
</action>
  <verify>
grep -n "taskSegment" packages/gantt-lib/src/components/TaskRow/TaskRow.css
</verify>
  <done>CSS supports multi-segment rendering, visual gaps between segments are clear</done>
</task>

<task type="auto">
  <name>Task 4: Add demo tasks with multiple segments</name>
  <files>packages/website/src/app/page.tsx</files>
  <action>
Add demo section showing multi-segment tasks to page.tsx:

```typescript
// Demo tasks with multiple segments (intermittent work)
const createMultiSegmentTasks = (): Task[] => {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const formatDate = (date: Date): string => date.toISOString().split('T')[0];
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const week1 = addDays(today, -14);
  const week2 = addDays(today, -7);
  const week3 = today;
  const week4 = addDays(today, 7);

  return [
    {
      id: 'segment-1',
      name: 'Прерывистая работа: 3 сегмента с перерывами',
      startDate: formatDate(week1), // fallback (not used when segments defined)
      endDate: formatDate(addDays(week4, 2)), // fallback (not used when segments defined)
      color: '#3b82f6',
      progress: 60,
      segments: [
        { startDate: formatDate(week1), endDate: formatDate(addDays(week1, 2)) },
        { startDate: formatDate(week2), endDate: formatDate(addDays(week2, 3)) },
        { startDate: formatDate(week3), endDate: formatDate(addDays(week3, 4)) },
      ],
    },
    {
      id: 'segment-2',
      name: 'Работа с большими перерывами',
      startDate: formatDate(week1),
      endDate: formatDate(addDays(week4, 5)),
      color: '#10b981',
      progress: 35,
      segments: [
        { startDate: formatDate(addDays(today, -10)), endDate: formatDate(addDays(today, -8)) },
        { startDate: formatDate(addDays(today, -5)), endDate: formatDate(addDays(today, -2)) },
        { startDate: formatDate(addDays(today, 2)), endDate: formatDate(addDays(today, 5)) },
      ],
    },
    {
      id: 'segment-3',
      name: 'Обычная задача (без сегментов)',
      startDate: formatDate(today),
      endDate: formatDate(addDays(today, 4)),
      color: '#f59e0b',
      progress: 50,
      // no segments = single bar
    },
  ];
};
```

Add state and handler:
```typescript
const [multiSegmentTasks, setMultiSegmentTasks] = useState<Task[]>(createMultiSegmentTasks);

const handleMultiSegmentChange = useCallback(
  (updated: Task[] | ((t: Task[]) => Task[])) =>
    setMultiSegmentTasks(typeof updated === "function" ? updated : () => updated),
  [],
);
```

Add UI section after "Expired Tasks Demo":
```tsx
{/* Multi-Segment Tasks Demo */}
<div style={{ marginBottom: "3rem" }}>
  <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.5rem" }}>
    Мульти-сегментные задачи (Quick 058)
  </h2>
  <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
    Одна задача с несколькими сегментами выполнения. Наглядно показывает прерывистую работу.
    Сегменты определяются через task.segments массив.
  </p>
  <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1rem" }}>
    <GanttChart
      tasks={multiSegmentTasks}
      onChange={handleMultiSegmentChange}
      dayWidth={40}
      rowHeight={40}
      containerHeight={200}
    />
  </div>
</div>
```
</action>
  <verify>
grep -n "multiSegment" packages/website/src/app/page.tsx
grep -n "segments:" packages/website/src/app/page.tsx
</verify>
  <done>Demo page shows multi-segment tasks, gaps between segments visible, normal tasks still work</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `npm run build`
2. Demo page renders multi-segment tasks correctly
3. Visual gaps between segments are clear
4. Task name and labels appear once per row
5. Single-segment tasks (backward compatibility) still work
6. Drag/resize behavior is handled (either disabled or first-segment-only)
</verification>

<success_criteria>
- Task interface extended with TaskSegment and segments array
- TaskRow renders multiple bars for tasks with segments
- Visual gaps between segments are natural from date ranges
- Task name/labels appear once per row, not per segment
- Backward compatibility: tasks without segments still work as single-bar
- Demo page shows example of multi-segment tasks
</success_criteria>

<output>
After completion, create `.planning/quick/058-multi-segment-task/058-SUMMARY.md`
</output>
