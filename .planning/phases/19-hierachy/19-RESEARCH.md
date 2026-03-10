# Phase 19: hierachy - Research

**Researched:** 2026-03-10
**Domain:** Task hierarchy (parent-child relationships) in Gantt charts
**Confidence:** HIGH

## Summary

Phase 19 implements one-level task hierarchy (parent → children) for the gantt-lib library. The implementation extends existing Task, TaskRow, and TaskList components to support parent-child relationships with automatic date/progress aggregation, collapsible UI, and cascade drag behavior. Based on analysis of existing codebase patterns (Phase 7 cascade engine, Phase 12 TaskList, Phase 17 action buttons), the hierarchy feature follows established React.memo optimization patterns, CSS variable theming, and callback-based state management.

**Primary recommendation:** Implement hierarchy using `parentId` optional field in Task interface, computed `isParent` flag, collapsed state tracking in GanttChart, and extended TaskListRow with indentation and collapse/expand buttons.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Уровни вложенности**: Один уровень: родитель → дети (нет глубокой вложенности)
- **Визуальное представление**:
  - Список задач: дочерние задачи имеют отступ вправо относительно родителя
  - Сворачивание: родительскую задачу можно сворачивать/разворачивать (кнопка +/-)
  - Стиль родителя: отличается от обычной задачи (другой тип полосы на шкале времени, другой вид в списке)
  - Шкала времени: родительская полоса выделяется визуально (другой стиль/цвет)
- **Даты родительской задачи**: Автоматически рассчитываются от детей:
  - `startDate = min(children.startDate)`
  - `endDate = max(children.endDate)`
  - Обновляются в реальном времени при перемещении детей
- **Прогресс родительской задачи**: Взвешенная сумма по длительности детей, каждая задача учитывается пропорционально своей длительности, автоматический пересчёт при изменении прогресса детей
- **Каскадное поведение при перетаскивании**:
  - Перемещение родителя: все дети сдвигаются на ту же дельту (как dependency cascade)
  - Перемещение ребёнка: даты родителя автоматически обновляются (расширяются/сужаются)
  - Двусторонняя связь между родителем и детьми
- **Создание иерархии**: Всплывающие кнопки "понизить/повысить" уровень задачи
- **Зависимости**: Родительская задача может иметь зависимости (predecessor/successor) как обычная задача
- **Удаление задач**: При удалении родителя — удаляются все дети (каскадное удаление), при удалении ребёнка — родитель обновляется (даты пересчитываются)

### Claude's Discretion
- Точное визуальное оформление родительской полосы (цвет, тень, границы)
- Позиция кнопок сворачивания и повышения/понижения
- Детали анимации сворачивания/разворачивания
- Обработка конфликтов при перемещении (например, ребёнок за пределами видимости)

### Deferred Ideas (OUT OF SCOPE)
- Глубокая вложенность (2+ уровней) — можно добавить позже
- Drag & drop для создания иерархии — всплывающие кнопки проще
- Виртуализация для больших иерархий — можно добавить при необходимости
- Экспорт/импорт иерархии — отдельная задача
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3+ (Next.js 15) | Component framework | Project uses Next.js 15 with React 18.3+ |
| TypeScript | 5.x | Type safety | Existing codebase uses strict TypeScript |
| date-fns | Existing | Date utilities | Project already uses date-fns for date operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React.memo | Built-in | Performance optimization | Use for TaskRow and TaskListRow to prevent re-render storms |
| useState/useCallback/useMemo | Built-in | State management | Follow existing patterns in GanttChart |
| CSS Variables | Custom | Theming | All project styles use `gantt-*` prefixed variables |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| parentId field | Nested children arrays | parentId is simpler for one-level nesting and easier to maintain flat array structure |
| Computed isParent | Stored isParent flag | Computed is more reliable and prevents data inconsistency |

**Installation:**
No additional packages needed — using existing project dependencies.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── GanttChart/
│   │   ├── GanttChart.tsx           # Add collapsed state, hierarchy utilities
│   │   └── GanttChart.css            # Parent bar styles
│   ├── TaskRow/
│   │   ├── TaskRow.tsx               # Add parent bar rendering
│   │   └── TaskRow.css               # Parent bar styles
│   ├── TaskList/
│   │   ├── TaskList.tsx              # Add collapse/expand handlers
│   │   ├── TaskListRow.tsx           # Add indentation, level buttons, collapse button
│   │   └── TaskList.css              # Child row indentation, parent row styles
│   └── ui/
│       └── index.ts                  # Existing UI components (PlusIcon, TrashIcon)
├── utils/
│   ├── dependencyUtils.ts            # Add hierarchy utilities (getChildren, computeParentDates, computeParentProgress)
│   └── index.ts
└── types/
    └── index.ts                      # Extend Task interface with parentId
```

### Pattern 1: Task Type Extension
**What:** Extend Task interface with optional parentId field for parent-child relationships
**When to use:** All tasks need optional parent reference
**Example:**
```typescript
// Source: Based on existing Task interface in types/index.ts
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
  // NEW: Hierarchy support
  parentId?: string;  // ID of parent task (undefined for root-level tasks)
}
```

### Pattern 2: Computed Parent Detection
**What:** Compute isParent flag by checking if any task has this task as parentId
**When to use:** Need to determine if a task is a parent for UI rendering
**Example:**
```typescript
// Source: New utility in dependencyUtils.ts
export function isTaskParent(taskId: string, tasks: Task[]): boolean {
  return tasks.some(t => t.parentId === taskId);
}

export function getChildren(parentId: string, tasks: Task[]): Task[] {
  return tasks.filter(t => t.parentId === parentId);
}
```

### Pattern 3: Parent Date Aggregation
**What:** Compute parent dates from children using min/max
**When to use:** Updating parent dates when children change
**Example:**
```typescript
// Source: New utility in dependencyUtils.ts
export function computeParentDates(parentId: string, tasks: Task[]): { startDate: Date; endDate: Date } {
  const children = getChildren(parentId, tasks);
  if (children.length === 0) {
    // Empty parent - use own dates or default
    const parent = tasks.find(t => t.id === parentId);
    return {
      startDate: new Date(parent?.startDate || Date.now()),
      endDate: new Date(parent?.endDate || Date.now()),
    };
  }
  const startDates = children.map(c => new Date(c.startDate));
  const endDates = children.map(c => new Date(c.endDate));
  return {
    startDate: new Date(Math.min(...startDates.map(d => d.getTime()))),
    endDate: new Date(Math.max(...endDates.map(d => d.getTime()))),
  };
}
```

### Pattern 4: Parent Progress Aggregation
**What:** Weighted progress calculation by duration
**When to use:** Calculating parent progress from children
**Example:**
```typescript
// Source: New utility in dependencyUtils.ts
export function computeParentProgress(parentId: string, tasks: Task[]): number {
  const children = getChildren(parentId, tasks);
  if (children.length === 0) return 0;

  let totalDurationWeight = 0;
  let weightedProgressSum = 0;

  const DAY_MS = 24 * 60 * 60 * 1000;

  for (const child of children) {
    const start = new Date(child.startDate).getTime();
    const end = new Date(child.endDate).getTime();
    const duration = (end - start + DAY_MS) / DAY_MS; // Inclusive duration
    const progress = child.progress ?? 0;

    totalDurationWeight += duration;
    weightedProgressSum += duration * progress;
  }

  return totalDurationWeight > 0 ? weightedProgressSum / totalDurationWeight : 0;
}
```

### Pattern 5: Collapsed State Management
**What:** Track collapsed parent IDs in GanttChart state
**When to use:** Controlling visibility of child tasks
**Example:**
```typescript
// Source: Extended GanttChart state
const [collapsedParentIds, setCollapsedParentIds] = useState<Set<string>>(new Set());

const handleToggleCollapse = useCallback((parentId: string) => {
  setCollapsedParentIds(prev => {
    const next = new Set(prev);
    if (next.has(parentId)) {
      next.delete(parentId);
    } else {
      next.add(parentId);
    }
    return next;
  });
}, []);
```

### Pattern 6: Cascade Drag for Parent Movement
**What:** Reuse Phase 7 cascade engine for moving parent with children
**When to use:** User drags parent task, all children should move by same delta
**Example:**
```typescript
// Source: Extended useTaskDrag with hierarchy support
// When dragging a parent, treat children like dependency chain
const hierarchyChain = isParent
  ? getChildren(task.id, allTasks)
  : [];

// Use existing cascade mechanism from Phase 7
onCascade?.([updatedTask, ...hierarchyChain]);
```

### Pattern 7: TaskListRow Indentation
**What:** Add left padding to child rows based on hierarchy level
**When to use:** Rendering child tasks in task list
**Example:**
```css
/* Source: TaskList.css extension */
.gantt-tl-row-child {
  padding-left: 24px; /* Indent child tasks */
}

.gantt-tl-row-parent {
  font-weight: 600;
  background-color: rgba(0, 0, 0, 0.02);
}
```

### Pattern 8: Parent Task Bar Styling
**What:** Distinct visual style for parent bars on timeline
**When to use:** Rendering parent task in TaskRow
**Example:**
```css
/* Source: TaskRow.css extension */
.gantt-tr-taskBar.gantt-tr-parentBar {
  background-color: var(--gantt-parent-bar-color, #6366f1);
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.gantt-tr-parentIcon {
  position: absolute;
  left: -20px;
  top: 50%;
  transform: translateY(-50%);
}
```

### Anti-Patterns to Avoid
- **Storing isParent in data**: Use computed isParent to prevent inconsistency when tasks are reorganized
- **Deep nesting without virtualization**: One-level nesting is enforced; defer deep nesting to future phase
- **Manual parent date updates**: Use computed aggregation utilities instead of manual date calculation
- **Separate hierarchy state**: Keep hierarchy data in flat Task array with parentId, not separate tree structure

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cascade drag for hierarchy | Custom parent drag logic | Reuse Phase 7 cascade engine | Phase 7 already implements task chain dragging with overridePosition mechanism |
| React optimization | Custom shouldComponentUpdate | React.memo with arePropsEqual | Project uses this pattern in TaskRow/TaskListRow for performance |
| Date calculations | Manual date math | date-fns or existing utilities | Project already has dateUtils.ts with UTC-safe operations |
| State management | Custom state machine | useState + useCallback patterns | Established project pattern from GanttChart |
| CSS theming | Hardcoded colors | CSS variables (--gantt-*) | Project theme system uses CSS variables |

**Key insight:** Hierarchy is primarily about data transformation (flat array → tree display) and reusing existing cascade/optimization patterns. Custom solutions for drag state, memoization, or theming would duplicate existing work and create inconsistency.

## Common Pitfalls

### Pitfall 1: Inconsistent Parent-Child Synchronization
**What goes wrong:** Parent dates not updated when child moves, or parent progress not recalculated
**Why it happens:** Missing onChange handlers for child updates that trigger parent recalculation
**How to avoid:** In handleTaskChange, detect if moved task has parentId and update parent via functional updater
**Warning signs:** Parent dates stay static after dragging child

### Pitfall 2: Re-render Storms with Hierarchy
**What goes wrong:** Dragging one child causes all rows to re-render
**Why it happens:** React.memo comparison includes parent/child state that changes on every drag
**How to avoid:** Exclude hierarchy-related callbacks from memo comparison (same pattern as onChange, onCascade)
**Warning signs:** Janky drag performance with 50+ tasks

### Pitfall 3: Cascade Conflicts (Dependencies + Hierarchy)
**What goes wrong:** Parent drag triggers both dependency cascade AND hierarchy cascade
**Why it happens:** Both systems use onCascade callback, causing double movement
**How to avoid:** Check if task is parent before dependency cascade; merge hierarchy chain with dependency chain
**Warning signs:** Children move twice the expected distance

### Pitfall 4: Orphaned Children After Delete
**What goes wrong:** Deleting parent leaves children with invalid parentId
**Why it happens:** onDelete handler only removes parent, doesn't clean up children
**How to avoid:** Cascade delete: remove all children when parent is deleted
**Warning signs:** Console errors about missing parent tasks

### Pitfall 5: Collapse State Desync
**What goes wrong:** Children hidden on chart but still visible in task list, or vice versa
**Why it happens:** Separate collapse state in TaskList and GanttChart
**How to avoid:** Single source of truth: collapsedParentIds in GanttChart, passed to TaskList
**Warning signs:** Row count mismatch between list and chart

### Pitfall 6: Parent Bar Geometry
**What goes wrong:** Parent bar width/position incorrect relative to children
**Why it happens:** Parent dates calculated but geometry uses original dates
**How to avoid:** Recalculate geometry (left, width) after parent date aggregation
**Warning signs:** Parent bar doesn't span full child range

### Pitfall 7: Circular Hierarchy
**What goes wrong:** Child becomes its own grandparent through parentId manipulation
**Why it happens:** No validation when setting parentId via promote/demote
**How to avoid:** Validate hierarchy has no cycles before applying level change (similar to dependency cycle detection)
**Warning signs:** Infinite loops in hierarchy traversal

## Code Examples

Verified patterns from existing codebase:

### Hierarchy Utilities (New)
```typescript
// Source: Based on existing dependencyUtils.ts patterns
export function getChildren(parentId: string, tasks: Task[]): Task[] {
  return tasks.filter(t => t.parentId === parentId);
}

export function isTaskParent(taskId: string, tasks: Task[]): boolean {
  return tasks.some(t => t.parentId === taskId);
}

export function computeParentDates(parentId: string, tasks: Task[]): { startDate: Date; endDate: Date } {
  const children = getChildren(parentId, tasks);
  if (children.length === 0) {
    const parent = tasks.find(t => t.id === parentId);
    const start = parent ? new Date(parent.startDate) : new Date();
    const end = parent ? new Date(parent.endDate) : new Date();
    return { startDate: start, endDate: end };
  }
  const startDates = children.map(c => new Date(c.startDate));
  const endDates = children.map(c => new Date(c.endDate));
  return {
    startDate: new Date(Math.min(...startDates.map(d => d.getTime()))),
    endDate: new Date(Math.max(...endDates.map(d => d.getTime()))),
  };
}

export function computeParentProgress(parentId: string, tasks: Task[]): number {
  const children = getChildren(parentId, tasks);
  if (children.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;
  const DAY_MS = 24 * 60 * 60 * 1000;

  for (const child of children) {
    const duration = (new Date(child.endDate).getTime() - new Date(child.startDate).getTime() + DAY_MS) / DAY_MS;
    const progress = child.progress ?? 0;
    totalWeight += duration;
    weightedSum += duration * progress;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

export function buildHierarchyMap(tasks: Task[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const task of tasks) {
    if (task.parentId) {
      const children = map.get(task.parentId) || [];
      children.push(task.id);
      map.set(task.parentId, children);
    }
  }
  return map;
}
```

### GanttChart State Extension
```typescript
// Source: Extended GanttChart.tsx based on existing useState patterns
const [collapsedParentIds, setCollapsedParentIds] = useState<Set<string>>(new Set());

const handleToggleCollapse = useCallback((parentId: string) => {
  setCollapsedParentIds(prev => {
    const next = new Set(prev);
    if (next.has(parentId)) {
      next.delete(parentId);
    } else {
      next.add(parentId);
    }
    return next;
  });
}, []);

const handlePromoteTask = useCallback((taskId: string) => {
  onChange?.((currentTasks) => {
    return currentTasks.map(t => {
      if (t.id === taskId && t.parentId) {
        // Remove parentId to promote to root level
        return { ...t, parentId: undefined };
      }
      return t;
    });
  });
}, [onChange]);

const handleDemoteTask = useCallback((taskId: string, newParentId: string) => {
  onChange?.((currentTasks) => {
    return currentTasks.map(t => {
      if (t.id === taskId) {
        // Set parentId to demote under new parent
        return { ...t, parentId: newParentId };
      }
      return t;
    });
  });
}, [onChange]);
```

### TaskListRow with Hierarchy
```typescript
// Source: Extended TaskListRow.tsx based on existing action buttons pattern
const isParent = useMemo(() => allTasks.some(t => t.parentId === task.id), [allTasks, task.id]);
const isChild = task.parentId !== undefined;

const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  onToggleCollapse?.(task.id);
}, [task.id, onToggleCollapse]);

const handlePromote = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  onPromoteTask?.(task.id);
}, [task.id, onPromoteTask]);

const handleDemote = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  // Demote under previous task (if it exists)
  const currentIndex = allTasks.findIndex(t => t.id === task.id);
  if (currentIndex > 0) {
    onDemoteTask?.(task.id, allTasks[currentIndex - 1].id);
  }
}, [task.id, allTasks, onDemoteTask]);

// In JSX:
<div className={`gantt-tl-row ${isChild ? 'gantt-tl-row-child' : ''} ${isParent ? 'gantt-tl-row-parent' : ''}`}>
  {/* Number cell with collapse/expand for parents */}
  <div className="gantt-tl-cell gantt-tl-cell-number">
    {isParent && (
      <button
        className="gantt-tl-collapse-btn"
        onClick={handleToggleCollapse}
        aria-label={collapsedParentIds.has(task.id) ? 'Развернуть' : 'Свернуть'}
      >
        {collapsedParentIds.has(task.id) ? '+' : '-'}
      </button>
    )}
    {!isParent && <span>{rowIndex + 1}</span>}
  </div>

  {/* Name cell with promote/demote actions */}
  <div className="gantt-tl-cell gantt-tl-cell-name">
    {/* ... existing name rendering ... */}
    <div className="gantt-tl-name-actions">
      {isChild && onPromoteTask && (
        <button className="gantt-tl-action-btn" onClick={handlePromote}>
          ⬆ Повысить
        </button>
      )}
      {!isParent && onDemoteTask && (
        <button className="gantt-tl-action-btn" onClick={handleDemote}>
          ⬇ Понизить
        </button>
      )}
    </div>
  </div>
</div>
```

### TaskRow Parent Bar Rendering
```typescript
// Source: Extended TaskRow.tsx based on existing bar rendering
const isParent = allTasks ? allTasks.some(t => t.parentId === task.id) : false;

// In JSX:
<div
  data-taskbar
  className={`gantt-tr-taskBar ${isDragging ? 'gantt-tr-dragging' : ''} ${isParent ? 'gantt-tr-parentBar' : ''}`}
  style={{
    left: `${displayLeft}px`,
    width: `${displayWidth}px`,
    backgroundColor: barColor,
    height: 'var(--gantt-task-bar-height)',
  }}
>
  {/* Progress rendering */}
  {progressWidth > 0 && !isParent && (
    <div className="gantt-tr-progressBar" style={{ width: `${progressWidth}%`, backgroundColor: progressColor }} />
  )}

  {/* Parent icon */}
  {isParent && (
    <svg className="gantt-tr-parentIcon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z" />
    </svg>
  )}

  {/* Duration label */}
  <span className="gantt-tr-taskDuration">
    {isParent ? `${getChildren(task.id, allTasks).length} задач` : `${durationDays} д`}
  </span>

  {/* Resize handles - hide for parents */}
  {!isParent && (
    <>
      <div className="gantt-tr-resizeHandle gantt-tr-resizeHandleLeft" />
      <div className="gantt-tr-resizeHandle gantt-tr-resizeHandleRight" />
    </>
  )}
</div>
```

### CSS Extensions
```css
/* Source: Extended TaskList.css based on existing patterns */
.gantt-tl-row-child {
  padding-left: 24px; /* Indent child tasks */
}

.gantt-tl-row-parent {
  font-weight: 600;
  background-color: var(--gantt-parent-row-bg, rgba(99, 102, 241, 0.05));
}

.gantt-tl-collapse-btn {
  width: 20px;
  height: 20px;
  border: 1px solid var(--gantt-grid-line-color, #e0e0e0);
  background: white;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}

.gantt-tl-collapse-btn:hover {
  background-color: var(--gantt-cell-background, #f9fafb);
}

/* Source: Extended TaskRow.css based on existing patterns */
.gantt-tr-parentBar {
  background: linear-gradient(135deg, var(--gantt-parent-bar-color, #6366f1) 0%, var(--gantt-parent-bar-color-end, #8b5cf6) 100%);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.gantt-tr-parentIcon {
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--gantt-parent-icon-color, #6366f1);
  pointer-events: none;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual parent state | Computed isParent from task array | Phase 19 (this phase) | Single source of truth, prevents inconsistency |
| Nested task objects | Flat array with parentId | Phase 19 (this phase) | Simplifies data management, easier to sync with dependencies |
| Custom cascade for hierarchy | Reuse Phase 7 cascade engine | Phase 19 (this phase) | Consistent drag behavior, less code duplication |
| Separate collapse UI | Integrated collapse/expand in TaskList | Phase 19 (this phase) | Unified UI, better UX |

**Deprecated/outdated:**
- Nested children arrays in Task object: parentId is simpler for one-level nesting
- Manual parent date synchronization: Use computed aggregation utilities
- Separate hierarchy drag logic: Reuse existing cascade engine

## Open Questions

1. **Parent task bar color theme**
   - What we know: Needs distinct visual style, should use CSS variables
   - What's unclear: Exact color scheme (should it be configurable or fixed?)
   - Recommendation: Use CSS variable `--gantt-parent-bar-color` with default indigo (#6366f1), allow consumers to override

2. **Collapse animation**
   - What we know: Children should be hidden/shown when parent is collapsed
   - What's unclear: Should there be a slide/fade animation or instant toggle?
   - Recommendation: Start with instant toggle (simpler), add CSS transitions in future phase if needed

3. **Parent with no children**
   - What we know: User may want to create parent task before adding children
   - What's unclear: Should empty parents be allowed? What dates do they show?
   - Recommendation: Allow empty parents (store own dates), switch to computed dates when first child is added

4. **Cascade delete confirmation**
   - What we know: Deleting parent deletes all children
   - What's unclear: Should user confirm before deleting entire subtree?
   - Recommendation: No confirmation (consistent with existing delete behavior), but show tooltip "N задач будет удалено"

5. **Conflict with dependencies**
   - What we know: Parent can have dependencies, children can have dependencies
   - What's unclear: What if child has dependency on parent's predecessor?
   - Recommendation: Allow it (dependencies are independent of hierarchy), but validate for cycles across both systems

## Validation Architecture

> Skip this section entirely if workflow.nyquist_validation is explicitly set to false in .planning/config.json. If the key is absent, treat as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing project setup) |
| Config file | packages/gantt-lib/vitest.config.ts |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIER-01 | Parent task detected by isParent computation | unit | `npm test -- hierarchy.test.ts` | ❌ Need to create |
| HIER-02 | Children retrieved by getChildren utility | unit | `npm test -- hierarchy.test.ts` | ❌ Need to create |
| HIER-03 | Parent dates aggregated from children | unit | `npm test -- hierarchy.test.ts` | ❌ Need to create |
| HIER-04 | Parent progress weighted by duration | unit | `npm test -- hierarchy.test.ts` | ❌ Need to create |
| HIER-05 | Child rows indented in task list | visual | Manual test in browser | N/A (visual) |
| HIER-06 | Collapse button hides/shows children | integration | Manual test in browser | N/A (visual) |
| HIER-07 | Parent drag moves all children | integration | `npm test -- hierarchy-drag.test.ts` | ❌ Need to create |
| HIER-08 | Child drag updates parent dates | integration | `npm test -- hierarchy-drag.test.ts` | ❌ Need to create |
| HIER-09 | Promote/demote buttons change hierarchy | unit | `npm test -- hierarchy.test.ts` | ❌ Need to create |
| HIER-10 | Parent delete cascades to children | unit | `npm test -- hierarchy.test.ts` | ❌ Need to create |

### Sampling Rate
- **Per task commit:** `npm test -- --run hierarchy.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/gantt-lib/src/utils/__tests__/hierarchy.test.ts` — hierarchy utilities (getChildren, isTaskParent, computeParentDates, computeParentProgress)
- [ ] `packages/gantt-lib/src/utils/__tests__/hierarchy-drag.test.ts` — cascade drag integration tests
- [ ] Framework install: None (Vitest already configured in Phase 1)

## Sources

### Primary (HIGH confidence)
- **Existing codebase analysis** — Examined packages/gantt-lib/src/components/GanttChart/GanttChart.tsx, TaskRow/TaskRow.tsx, TaskList/TaskList.tsx, TaskList/TaskListRow.tsx for established patterns
- **Phase 7 cascade engine** — Reviewed useTaskDrag.ts and dependencyUtils.ts to understand reusable cascade mechanism
- **Project CSS patterns** — Analyzed TaskList.css, TaskRow.css for CSS variable usage and class naming conventions

### Secondary (MEDIUM confidence)
- **CONTEXT.md decisions** — User-defined requirements for hierarchy feature (locked decisions and discretion areas)
- **STATE.md project history** — Reviewed 89 completed quick tasks and 17 phases to understand project evolution and patterns

### Tertiary (LOW confidence)
- **General React hierarchy patterns** — Based on training data for tree/flat array transformation (marked for validation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, no new dependencies needed
- Architecture: HIGH - Based on analysis of existing codebase patterns (React.memo, cascade engine, state management)
- Pitfalls: HIGH - Identified from existing project patterns (Phase 7 cascade conflicts, Phase 12 task list desync)
- Code examples: HIGH - Derived from actual source code with consistent patterns

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (30 days - stable domain, but depends on project evolution)
