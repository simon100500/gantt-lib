# Task Filtering

The library supports task filtering via a predicate-based API. You can:
- Use ready-made filters for common scenarios
- Combine filters with boolean logic (`and`, `or`, `not`)
- Create custom predicates for any filtering logic
- Pass filters to `GanttChart` via the `taskFilter` prop

**Key behaviors:**
- Filtered tasks are **hidden from view** but remain in the data
- Dependencies work on **ALL tasks** including hidden ones
- Filter updates in real-time when the predicate changes
- Filtering does NOT modify the underlying `tasks` array

---

## Basic Usage

Import the filter utilities:

```tsx
import { GanttChart, type TaskPredicate } from 'gantt-lib';
import { and, or, not, withoutDeps, expired, inDateRange, progressInRange, nameContains } from 'gantt-lib/filters';
```

Pass a filter to `GanttChart`:

```tsx
const myFilter = withoutDeps();

<GanttChart
  tasks={tasks}
  taskFilter={myFilter}
/>
```

---

## TaskPredicate Type

All filters are functions that accept a task and return a boolean:

```typescript
type TaskPredicate = (task: Task | undefined) => boolean;
```

- **Input:** `Task | undefined` — undefined is passed for placeholder/empty rows
- **Output:** `true` = show task, `false` = hide task
- **Safe:** Always check `if (!task) return false;` in custom predicates

---

## Ready-Made Filters

The library provides 6 ready-made filters for common use cases:

### `withoutDeps()`

Filter tasks that have no dependencies:

```tsx
import { withoutDeps } from 'gantt-lib/filters';

<GanttChart
  tasks={tasks}
  taskFilter={withoutDeps()}
/>
```

**Use case:** Find root tasks that can start independently.

To match only child tasks without dependencies, pass `onlyChildren`:

```tsx
const filter = withoutDeps({ onlyChildren: true });
```

**Use case:** Find leaf work items that are not linked to a predecessor, while ignoring parent/group rows.

---

### `expired(referenceDate?)`

Filter overdue tasks (tasks ending before the reference date):

```tsx
import { expired } from 'gantt-lib/filters';

// Uses today's date by default
<GanttChart
  tasks={tasks}
  taskFilter={expired()}
/>

// Or specify a custom reference date
<GanttChart
  tasks={tasks}
  taskFilter={expired(new Date(Date.UTC(2026, 5, 1)))}
/>
```

**Use case:** Identify delayed tasks for project recovery.

---

### `inDateRange(rangeStart, rangeEnd)`

Filter tasks that intersect with a date range:

```tsx
import { inDateRange } from 'gantt-lib/filters';

// Show tasks in March 2026
const marchStart = new Date(Date.UTC(2026, 2, 1));
const marchEnd = new Date(Date.UTC(2026, 2, 31));

<GanttChart
  tasks={tasks}
  taskFilter={inDateRange(marchStart, marchEnd)}
/>
```

**Intersection logic:** Task intersects if `taskStart <= rangeEnd && taskEnd >= rangeStart`.

**Use case:** Focus on specific time periods (sprints, quarters).

---

### `progressInRange(min, max)`

Filter tasks by progress percentage:

```tsx
import { progressInRange } from 'gantt-lib/filters';

// Show not started tasks (0%)
<GanttChart
  tasks={tasks}
  taskFilter={progressInRange(0, 0)}
/>

// Show in-progress tasks (1-99%)
<GanttChart
  tasks={tasks}
  taskFilter={progressInRange(1, 99)}
/>

// Show completed tasks (100%)
<GanttChart
  tasks={tasks}
  taskFilter={progressInRange(100, 100)}
/>
```

**Use case:** Track project completion status.

---

### `nameContains(substring, caseSensitive?)`

Filter tasks by name substring:

```tsx
import { nameContains } from 'gantt-lib/filters';

// Case-insensitive search (default)
<GanttChart
  tasks={tasks}
  taskFilter={nameContains('backend')}
/>

// Case-sensitive search
<GanttChart
  tasks={tasks}
  taskFilter={nameContains('API', true)}
/>
```

**Use case:** Quick search by task name/keyword.

---

## Boolean Composites

Combine multiple filters with boolean logic:

### `and(...predicates)`

All predicates must return `true`:

```tsx
import { and, expired, nameContains } from 'gantt-lib/filters';

// Show expired tasks containing "backend"
const filter = and(expired(), nameContains('backend'));

<GanttChart
  tasks={tasks}
  taskFilter={filter}
/>
```

---

### `or(...predicates)`

At least one predicate must return `true`:

```tsx
import { or, withoutDeps, progressInRange } from 'gantt-lib/filters';

// Show tasks without deps OR completed tasks
const filter = or(withoutDeps(), progressInRange(100, 100));

<GanttChart
  tasks={tasks}
  taskFilter={filter}
/>
```

---

### `not(predicate)`

Inverts the predicate logic:

```tsx
import { not, expired } from 'gantt-lib/filters';

// Hide expired tasks (show non-expired)
const filter = not(expired());

<GanttChart
  tasks={tasks}
  taskFilter={filter}
/>
```

---

## Complex Combinations

Nest composites for complex logic:

```tsx
import { and, or, not, expired, progressInRange, nameContains } from 'gantt-lib/filters';

// Show (NOT expired AND in-progress) OR tasks containing "critical"
const filter = or(
  and(not(expired()), progressInRange(1, 99)),
  nameContains('critical')
);

<GanttChart
  tasks={tasks}
  taskFilter={filter}
/>
```

---

## Custom Predicates

Create your own predicates for custom logic:

```tsx
import { type TaskPredicate } from 'gantt-lib';

// Filter by color
const blueTasks: TaskPredicate = (task) => {
  if (!task) return false;
  return task.color === '#3b82f6';
};

// Filter by parent status
const topLevelTasks: TaskPredicate = (task) => {
  if (!task) return false;
  return !task.parentId;
};

// Filter by duration (shorter than 7 days)
const shortTasks: TaskPredicate = (task) => {
  if (!task) return false;
  const start = new Date(task.startDate);
  const end = new Date(task.endDate);
  const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return days < 7;
};

// Use custom predicates
<GanttChart
  tasks={tasks}
  taskFilter={blueTasks}
/>
```

---

## Combining Custom + Ready-Made

```tsx
import { and, withoutDeps } from 'gantt-lib/filters';

// Combine custom predicate with ready-made filter
const rootBackendTasks: TaskPredicate = and(
  withoutDeps(),
  (task) => task?.name.toLowerCase().includes('backend') ?? false
);

<GanttChart
  tasks={tasks}
  taskFilter={rootBackendTasks}
/>
```

---

## Dynamic Filters

Use `useState` for dynamic filter changes:

```tsx
import { useState } from 'react';
import { GanttChart } from 'gantt-lib';
import { expired, progressInRange, withoutDeps } from 'gantt-lib/filters';

export default function App() {
  const [filterType, setFilterType] = useState<'all' | 'expired' | 'completed' | 'root'>('all');

  const getFilter = () => {
    switch (filterType) {
      case 'expired': return expired();
      case 'completed': return progressInRange(100, 100);
      case 'root': return withoutDeps();
      default: return undefined;
    }
  };

  return (
    <>
      <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
        <option value="all">All Tasks</option>
        <option value="expired">Expired Only</option>
        <option value="completed">Completed Only</option>
        <option value="root">Root Tasks Only</option>
      </select>
      <GanttChart tasks={tasks} taskFilter={getFilter()} />
    </>
  );
}
```

---

## Filter Behavior Details

**Dependencies and filtering:**
- Dependencies are calculated on ALL tasks, including hidden ones
- Dragging a visible task still respects constraints from hidden predecessors
- Dependency lines from hidden tasks are not rendered

**Task list behavior:**
- Row numbers reflect the **filtered view** (not the original array index)
- Hidden tasks are excluded from row reordering
- Add/delete operations work on the full `tasks` array

**Performance:**
- Filters run on every render — keep predicates lightweight
- For large task sets (>1000), consider memoizing predicates with `useMemo`

---

## Usage Examples

**Example 1: Sprint Focus**

```tsx
import { inDateRange } from 'gantt-lib/filters';

const sprintStart = new Date(Date.UTC(2026, 2, 1));  // March 1
const sprintEnd = new Date(Date.UTC(2026, 2, 14));   // March 14

<GanttChart
  tasks={tasks}
  taskFilter={inDateRange(sprintStart, sprintEnd)}
/>
```

**Example 2: Risk Dashboard**

```tsx
import { or, and, not, expired, progressInRange } from 'gantt-lib/filters';

// Show expired OR (behind schedule)
const riskFilter = or(
  expired(),
  and(
    not(expired()),
    progressInRange(0, 50)  // Less than 50% complete
  )
);

<GanttChart
  tasks={tasks}
  taskFilter={riskFilter}
/>
```

**Example 3: Assignee Search**

```tsx
import { type TaskPredicate } from 'gantt-lib';

const byAssignee = (assigneeName: string): TaskPredicate =>
  (task) => {
    if (!task) return false;
    // Assuming you store assignee in task metadata
    return (task as any).assignee?.toLowerCase() === assigneeName.toLowerCase();
  };

<GanttChart
  tasks={tasks}
  taskFilter={byAssignee('alice')}
/>
```

**Example 4: Multi-Filter UI**

```tsx
import { useState, useMemo } from 'react';
import { GanttChart } from 'gantt-lib';
import { and, or, not, expired, progressInRange, nameContains, inDateRange } from 'gantt-lib/filters';

export default function FilterableGantt() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [progressRange, setProgressRange] = useState<[number, number]>([0, 100]);

  const filter = useMemo(() => {
    const predicates: Array<(task: any) => boolean> = [];

    if (searchQuery) {
      predicates.push(nameContains(searchQuery));
    }

    if (showExpiredOnly) {
      predicates.push(expired());
    }

    if (progressRange[0] > 0 || progressRange[1] < 100) {
      predicates.push(progressInRange(progressRange[0], progressRange[1]));
    }

    return predicates.length > 0 ? and(...predicates) : undefined;
  }, [searchQuery, showExpiredOnly, progressRange]);

  return (
    <>
      <input
        placeholder="Search tasks..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={showExpiredOnly}
          onChange={(e) => setShowExpiredOnly(e.target.checked)}
        />
        Expired only
      </label>
      <GanttChart tasks={tasks} taskFilter={filter} />
    </>
  );
}
```

---

## Filter Display Modes — Highlight vs Hide

The library supports two filter display modes via `filterMode` prop:

| Mode | Behavior | Use Case |
|------|----------|----------|
| `'highlight'` (default) | Matching tasks are highlighted with yellow background, all tasks remain visible | Search results, navigation state |
| `'hide'` | Non-matching tasks are hidden from view, only matching tasks visible | Focus mode, filtered views |

**Props:**

```typescript
interface GanttChartProps {
  filterMode?: 'highlight' | 'hide';
  filteredTaskIds?: Set<string>;
  isFilterActive?: boolean;
  highlightedTaskIds?: Set<string>;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filterMode` | `'highlight' \| 'hide'` | `'highlight'` | Display mode for filtered tasks |
| `filteredTaskIds` | `Set<string>` | `undefined` | Task IDs that match the filter |
| `isFilterActive` | `boolean` | `false` | Whether filter is active (distinguishes "no filter" from "no matches") |
| `highlightedTaskIds` | `Set<string>` | `undefined` | Alias for `filteredTaskIds` in highlight mode |

---

### Highlight Mode Example

```tsx
import { useState, useMemo } from 'react';
import { GanttChart } from 'gantt-lib';

export default function HighlightExample() {
  const [searchQuery, setSearchQuery] = useState('');

  const highlightedTaskIds = useMemo(() => {
    if (!searchQuery) return new Set();
    const matches = tasks.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return new Set(matches.map(t => t.id));
  }, [searchQuery, tasks]);

  return (
    <>
      <input
        placeholder="Search tasks..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <GanttChart
        tasks={tasks}
        filterMode="highlight"
        highlightedTaskIds={highlightedTaskIds}
      />
    </>
  );
}
```

**Visual result:** Matching tasks display with yellow background, all tasks remain visible.

---

### Hide Mode Example

```tsx
import { useState, useMemo } from 'react';
import { GanttChart } from 'gantt-lib';

export default function HideModeExample() {
  const [searchQuery, setSearchQuery] = useState('');

  const { filteredTaskIds, isFilterActive } = useMemo(() => {
    if (!searchQuery) {
      return { filteredTaskIds: new Set(), isFilterActive: false };
    }
    const matches = tasks.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return {
      filteredTaskIds: new Set(matches.map(t => t.id)),
      isFilterActive: true,
    };
  }, [searchQuery, tasks]);

  return (
    <>
      <input
        placeholder="Search tasks..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <GanttChart
        tasks={tasks}
        filterMode="hide"
        filteredTaskIds={filteredTaskIds}
        isFilterActive={isFilterActive}
      />
    </>
  );
}
```

**Visual result:** Only matching tasks are visible, non-matching tasks are hidden from both task list and chart.

---

### Task Numbering in Hide Mode

**Important:** In hide mode (`filterMode='hide'` with `isFilterActive={true}`), task numbers in the № column are **preserved from the original unfiltered list**. This ensures that task IDs remain consistent when filtering.

Example:
```
Before filter:    After filter (tasks 2, 4 hidden):
1  Task A         1  Task A
2  Task B         3  Task C
3  Task C         5  Task E
4  Task D
5  Task E
```

Task numbers (1, 3, 5) reflect the original positions, not the filtered view (1, 2, 3).

---

### Hierarchy Lines in Hide Mode

In hide mode, hierarchy connector lines are simplified to avoid visual confusion:
- **Parent tasks:** No vertical guide line (only collapse/expand button)
- **Child tasks:** Only horizontal branch line with dot (no vertical lines)

This prevents the appearance of broken hierarchy when intermediate tasks are hidden.

---

### Switching Between Modes

```tsx
const [filterMode, setFilterMode] = useState<'highlight' | 'hide'>('highlight');

<GanttChart
  tasks={tasks}
  filterMode={filterMode}
  filteredTaskIds={filteredTaskIds}
  isFilterActive={isFilterActive}
/>
<button onClick={() => setFilterMode('highlight')}>Highlight</button>
<button onClick={() => setFilterMode('hide')}>Hide</button>
```

---

[← Back to API Reference](./INDEX.md)
