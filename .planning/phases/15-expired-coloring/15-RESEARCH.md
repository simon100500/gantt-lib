# Phase 15: expired-coloring - Research

**Researched:** 2026-03-04
**Domain:** React component conditional styling with date-based logic
**Confidence:** HIGH

## Summary

This phase adds visual highlighting for overdue/expired tasks in the Gantt chart. The implementation involves adding a boolean prop `highlightExpiredTasks` to the GanttChart component, computing expiration status per task based on date comparison and completion status, and conditionally applying a red background color to expired task bars.

The key technical challenges are:
1. **Date comparison logic** - Determining if `endDate < today` using UTC-safe comparison
2. **Completion status check** - Verifying `progress < 100%` OR `accepted !== true`
3. **Conditional styling** - Applying red background only when `highlightExpiredTasks && isExpired`
4. **React.memo optimization** - Adding the new prop to the `arePropsEqual` comparison function

**Primary recommendation:** Use inline styles for the expired background color with a CSS variable for the red color value, following the existing pattern established for task bar colors.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Logic for expiration determination:**
A task is considered expired if ALL conditions are met:
- `endDate < today` — the task's end date has passed
- AND one of:
  - `progress < 100%` — task is not fully complete
  - `accepted !== true` — task is not accepted

Tasks that are 100% complete AND accepted are NOT expired, even if the end date has passed.

**Visual style:**
- Red background color for the entire task bar
- Background color completely replaces the original `task.color`
- Progress bar and text remain visible above the red background
- Red color: CSS variable `--gantt-expired-color` (default #ef4444)

**Interaction with progress:**
- Binary logic — either red or not red
- Progress percentage does NOT affect red intensity
- 10% and 90% complete tasks get the same red if expired

**API design:**
- Prop name: `highlightExpiredTasks?: boolean`
- Location: `GanttChart` component (not TaskRow)
- Default value: `false` (backward compatible)
- Passed down to `TaskRow` via props

### Claude's Discretion

- Exact red color default value (#ef4444 or similar shade)
- z-index and layer ordering if red background overlaps other elements
- CSS transition animation when expiration status changes (smooth vs instant)

### Deferred Ideas (OUT OF SCOPE)

- Gradual red intensity based on progress percentage
- Separate color for "expired but almost complete" (e.g., orange)
- Visual indicator in task list (icon or text color)
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18+ | Component framework | Already in use |
| TypeScript | 5.7+ | Type safety | Already in use |
| date-fns | 4.1.0 | Date utilities | Already used for `parseUTCDate` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS Variables | Native | Color theming | Already used for all colors |
| Inline Styles | React | Dynamic styling | Already used for task bar colors |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline styles | CSS class `.gantt-tr-expired` | CSS class is cleaner for static styles, but inline styles match existing pattern for dynamic colors |
| N/A | CSS-in-JS library | Adds dependency, unnecessary for simple conditional color |

**Installation:**
No additional dependencies required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── GanttChart/
│   │   ├── GanttChart.tsx      # Add highlightExpiredTasks prop, pass to TaskRow
│   │   └── GanttChart.css
│   ├── TaskRow/
│   │   ├── TaskRow.tsx         # Add isExpired logic, conditional background
│   │   └── TaskRow.css         # Optional .gantt-tr-expired class
│   └── ...
├── utils/
│   └── dateUtils.ts            # Reuse parseUTCDate, isToday functions
├── styles.css                  # Add --gantt-expired-color variable
└── types/
    └── index.ts
```

### Pattern 1: Conditional Task Bar Background Color
**What:** Conditionally set `backgroundColor` style based on task expiration status
**When to use:** When `highlightExpiredTasks` is true and task meets expiration criteria
**Example:**
```typescript
// Source: Existing TaskRow.tsx pattern (line 110)
const barColor = task.color || 'var(--gantt-task-bar-default-color)';

// New pattern for expired tasks:
const isExpired = useMemo(() => {
  if (!highlightExpiredTasks) return false;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const taskEnd = parseUTCDate(task.endDate);
  const endDatePassed = taskEnd.getTime() < today.getTime();
  const notComplete = (task.progress ?? 0) < 100;
  const notAccepted = task.accepted !== true;
  return endDatePassed && (notComplete || notAccepted);
}, [task.endDate, task.progress, task.accepted, highlightExpiredTasks]);

const barColor = isExpired
  ? 'var(--gantt-expired-color)'
  : (task.color || 'var(--gantt-task-bar-default-color)');
```

### Pattern 2: Prop Drilling for Feature Flags
**What:** Pass boolean feature flags from parent to child components
**When to use:** When a global feature needs to be applied to all child components
**Example:**
```typescript
// Source: Existing GanttChart.tsx pattern (lines 511-536)
{tasks.map((task, index) => (
  <TaskRow
    key={task.id}
    task={task}
    monthStart={monthStart}
    dayWidth={dayWidth}
    rowHeight={rowHeight}
    // ... existing props
  />
))}

// New pattern - add prop:
<TaskRow
  key={task.id}
  task={task}
  highlightExpiredTasks={highlightExpiredTasks}
  // ... other props
/>
```

### Pattern 3: React.memo Prop Comparison Extension
**What:** Add new props to the `arePropsEqual` function to prevent unnecessary re-renders
**When to use:** When adding new props to a memoized component
**Example:**
```typescript
// Source: Existing TaskRow.tsx pattern (lines 66-86)
const arePropsEqual = (prevProps: TaskRowProps, nextProps: TaskRowProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    // ... existing comparisons
    prevProps.task.divider === nextProps.task.divider
    // onChange, onCascadeProgress, onCascade excluded - see note above
  );
};

// New pattern - add highlightExpiredTasks:
const arePropsEqual = (prevProps: TaskRowProps, nextProps: TaskRowProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    // ... existing comparisons
    prevProps.task.divider === nextProps.task.divider &&
    prevProps.highlightExpiredTasks === nextProps.highlightExpiredTasks
  );
};
```

### Anti-Patterns to Avoid
- **Using local `new Date()` inside render without memoization**: Can cause unnecessary re-renders. Memoize the `today` calculation or use `useMemo` for the entire expiration logic.
- **Assuming `progress` exists**: Tasks may not have a `progress` property. Use `task.progress ?? 0` for null coalescing.
- **Assuming `accepted` exists**: Tasks may not have an `accepted` property. Check `task.accepted !== true` which handles both `undefined` and `false`.
- **Adding transitions during drag**: CSS transitions during drag cause lag/ghosting. Follow the existing pattern of `transition: none !important` for `.gantt-tr-dragging`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date comparison logic | Custom `isBefore` functions | `date.getTime()` comparison | Simpler, more reliable, already using UTC dates |
| Null/undefined handling for progress | Custom checks | Nullish coalescing `??` | Cleaner, handles both null and undefined |
| Today's date calculation | Repeated `new Date()` calls | Single memoized calculation | Performance, consistency |

**Key insight:** The project already uses UTC-safe date handling via `parseUTCDate`. Continue using this pattern and compare timestamps via `.getTime()` for reliable date comparison.

## Common Pitfalls

### Pitfall 1: Timezone-Dependent Date Comparison
**What goes wrong:** Using `date < new Date()` without UTC normalization causes tasks to be incorrectly marked as expired depending on user's timezone.
**Why it happens:** `new Date()` creates a date in the local timezone, while task dates are stored as UTC.
**How to avoid:** Always create UTC versions of both dates before comparison:
```typescript
const now = new Date();
const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const taskEnd = parseUTCDate(task.endDate);
const endDatePassed = taskEnd.getTime() < today.getTime();
```
**Warning signs:** Tests fail when run in different timezones, or expiration status changes throughout the day.

### Pitfall 2: Not Handling Missing Properties
**What goes wrong:** Tasks without `progress` or `accepted` properties cause runtime errors or incorrect logic.
**Why it happens:** TypeScript types mark these as optional, but code assumes they exist.
**How to avoid:** Use nullish coalescing for progress and strict boolean check for accepted:
```typescript
const notComplete = (task.progress ?? 0) < 100;
const notAccepted = task.accepted !== true; // Handles undefined and false
```
**Warning signs:** TypeScript warnings about possible undefined values, runtime errors on task objects without progress.

### Pitfall 3: Unnecessary Re-renders Due to Missing Memo
**What goes wrong:** All tasks re-render on every frame when expiration checking isn't memoized.
**Why it happens:** `isExpired` is calculated on every render without `useMemo`.
**How to avoid:** Memoize the expiration calculation with all dependencies:
```typescript
const isExpired = useMemo(() => {
  // ... calculation
}, [task.endDate, task.progress, task.accepted, highlightExpiredTasks]);
```
**Warning signs:** Performance degradation with many tasks, React DevTools shows frequent re-renders.

### Pitfall 4: Forgetting to Update React.memo Comparison
**What goes wrong:** Adding `highlightExpiredTasks` prop but not including it in `arePropsEqual` causes unnecessary re-renders or missing updates.
**Why it happens:** React.memo uses a custom comparison function that must be updated when new props are added.
**How to avoid:** Always add new boolean props to the comparison function:
```typescript
prevProps.highlightExpiredTasks === nextProps.highlightExpiredTasks
```
**Warning signs:** Toggling the flag doesn't update the UI, or all tasks re-render when flag changes.

## Code Examples

Verified patterns from official sources:

### Expired Task Calculation
```typescript
// Source: Based on existing dateUtils.ts patterns
const isExpired = useMemo(() => {
  if (!highlightExpiredTasks) return false;

  // Create UTC today for comparison
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Parse task end date as UTC
  const taskEnd = parseUTCDate(task.endDate);

  // Check if end date has passed
  const endDatePassed = taskEnd.getTime() < today.getTime();

  // Check if task is incomplete or not accepted
  const notComplete = (task.progress ?? 0) < 100;
  const notAccepted = task.accepted !== true;

  return endDatePassed && (notComplete || notAccepted);
}, [task.endDate, task.progress, task.accepted, highlightExpiredTasks]);
```

### Conditional Background Color
```typescript
// Source: Existing TaskRow.tsx pattern (line 204)
const barColor = isExpired
  ? 'var(--gantt-expired-color)'
  : (task.color || 'var(--gantt-task-bar-default-color)');

// In JSX:
<div
  className={`gantt-tr-taskBar ${isDragging ? 'gantt-tr-dragging' : ''}`}
  style={{
    left: `${displayLeft}px`,
    width: `${displayWidth}px`,
    backgroundColor: barColor,
    height: 'var(--gantt-task-bar-height)',
    cursor: dragHandleProps.style.cursor,
    userSelect: dragHandleProps.style.userSelect,
  }}
>
```

### CSS Variable Definition
```css
/* Source: Existing styles.css pattern (line 45) */
:root {
  /* Existing colors... */
  --gantt-dependency-cycle-color: #ef4444;

  /* New expired color */
  --gantt-expired-color: #ef4444;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A (new feature) | Binary expiration flag + CSS variable | Phase 15 | Simple, performant, matches existing theming system |

**Deprecated/outdated:**
- None — this is a new feature

## Open Questions

1. **Exact red color value**
   - What we know: Should use Tailwind red-500 (#ef4444) to match cycle color
   - What's unclear: Whether to use a distinct shade for expired vs cycle
   - Recommendation: Use #ef4444 (red-500) as default, document that users can override via CSS variable

2. **CSS transition on color change**
   - What we know: Transitions are disabled during drag for performance
   - What's unclear: Whether smooth transition is desired when `highlightExpiredTasks` is toggled
   - Recommendation: Add transition only in non-dragging state: `transition: background-color 0.2s ease;` (can be removed in Claude's discretion)

3. **Today's date calculation frequency**
   - What we know: `new Date()` is called inside `useMemo` dependency
   - What's unclear: Whether today's date needs to update if app runs past midnight
   - Recommendation: Current approach is fine for typical usage (users refresh page daily)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.0.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test -- src/__tests__/dateUtils.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| Expired calculation: endDate < today + progress < 100% | unit | `npm run test -- src/__tests__/expiredTask.test.ts -t "expired when end date passed and progress < 100"` | ❌ Wave 0 |
| Expired calculation: endDate < today + not accepted | unit | `npm run test -- src/__tests__/expiredTask.test.ts -t "expired when end date passed and not accepted"` | ❌ Wave 0 |
| Not expired: progress = 100% AND accepted = true | unit | `npm run test -- src/__tests__/expiredTask.test.ts -t "not expired when complete and accepted"` | ❌ Wave 0 |
| Not expired: endDate >= today | unit | `npm run test -- src/__tests__/expiredTask.test.ts -t "not expired when end date in future"` | ❌ Wave 0 |
| Not expired: highlightExpiredTasks = false | unit | `npm run test -- src/__tests__/expiredTask.test.ts -t "not expired when feature disabled"` | ❌ Wave 0 |
| Visual: red background applied | visual/manual | Manual verification in demo page | N/A |
| Visual: progress bar visible over red | visual/manual | Manual verification in demo page | N/A |
| Performance: no unnecessary re-renders | unit | `npm run test -- src/__tests__/TaskRow.test.ts -t "memo comparison includes highlightExpiredTasks"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- src/__tests__/expiredTask.test.ts`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/expiredTask.test.ts` — new test file for expiration logic (isExpired utility or component tests)
- [ ] `src/__tests__/TaskRow.test.ts` — add test case for React.memo comparison with `highlightExpiredTasks` prop

## Sources

### Primary (HIGH confidence)
- **Existing codebase** - TaskRow.tsx, GanttChart.tsx, dateUtils.ts, styles.css, TaskRow.css
- **vitest.config.ts** - Test framework configuration
- **package.json** - Test scripts and dependencies

### Secondary (MEDIUM confidence)
- **CONTEXT.md** - User decisions and implementation constraints

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Based on existing project dependencies and patterns
- Architecture: HIGH - Directly follows established component patterns in the codebase
- Pitfalls: HIGH - Identified from existing code patterns and common React issues

**Research date:** 2026-03-04
**Valid until:** 2026-04-03 (30 days - stable domain)
