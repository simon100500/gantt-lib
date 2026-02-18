# Architecture Research

**Domain:** React Gantt Chart Library
**Researched:** 2026-02-18
**Confidence:** MEDIUM (based on established React patterns; web search was rate-limited)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  TaskList    │  │  TimeScale   │  │  TaskBars    │      │
│  │  (Sidebar)   │  │  (Header)    │  │  (Canvas)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
├─────────┴──────────────────┴──────────────────┴──────────────┤
│                      Interaction Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  DnD Manager │  │  Selection   │  │  Scroll      │      │
│  │  (Move/Resize)│  │  Handler     │  │  Sync        │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
├─────────┴──────────────────┴──────────────────┴──────────────┤
│                      State Management                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              GanttStore / Context                    │    │
│  │  - tasks, viewState, selection, dragState           │    │
│  └─────────────────────┬───────────────────────────────┘    │
│                         │                                     │
├─────────────────────────┴─────────────────────────────────────┤
│                      Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Task Data   │  │  Date Utils  │  │  Geometry    │      │
│  │  Models      │  │  Helpers     │  │  Calculators │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **GanttContainer** | Root component; orchestrates all state and layout | Context provider + layout div wrapper |
| **TaskListSidebar** | Renders task names, handles selection sync | Virtualized list (react-window) + custom scroll handler |
| **TimeScaleHeader** | Displays calendar grid (month/day headers) | Canvas or CSS Grid with date calculations |
| **GanttGridCanvas** | Main canvas for task bars and grid lines | HTML5 Canvas with requestAnimationFrame loop |
| **TaskBar** | Individual task rendering (if DOM) or draw function | Rect with color/styling; hit detection for DnD |
| **DnDManager** | Drag-and-drop state machine (move/resize) | Keyboard/mouse event handlers + state tracking |
| **SelectionManager** | Handles multi-select, keyboard navigation | Set-based selection + event delegation |
| **ScrollSync** | Coordinates horizontal scroll between header & body | Scroll event listeners + position synchronization |
| **GeometryEngine** | Converts dates to pixels and vice versa | Pure functions; date range → x coordinate |

## Recommended Project Structure

```
src/
├── components/           # React components
│   ├── GanttChart/       # Main container
│   │   ├── index.tsx
│   │   ├── GanttChart.tsx
│   │   └── GanttChart.test.tsx
│   ├── TaskList/         # Left sidebar
│   │   ├── index.tsx
│   │   ├── TaskList.tsx
│   │   ├── TaskRow.tsx
│   │   └── VirtualizedTaskList.tsx
│   ├── TimeScale/        # Calendar header
│   │   ├── index.tsx
│   │   ├── TimeScale.tsx
│   │   ├── MonthHeader.tsx
│   │   └── DayHeader.tsx
│   └── TaskBars/         # Task rendering
│       ├── index.tsx
│       ├── TaskBar.tsx
│       ├── TaskBarCanvas.tsx
│       └── TaskBarGroup.tsx
├── canvas/               # Canvas-specific rendering
│   ├── renderers/        # Draw functions
│   │   ├── gridRenderer.ts
│   │   ├── taskRenderer.ts
│   │   └── dependencyRenderer.ts
│   ├── hitDetection.ts   # Pixel → element mapping
│   └── coordinateSystem.ts # Date ↔ Pixel conversion
├── hooks/                # Custom React hooks
│   ├── useGanttState.ts
│   ├── useDragAndDrop.ts
│   ├── useSelection.ts
│   ├── useScrollSync.ts
│   └── useCanvas.ts
├── state/                # State management
│   ├── context.tsx       # React Context
│   ├── reducers.ts       # State reducers
│   ├── actions.ts        # Action creators
│   └── selectors.ts      # State selectors
├── utils/                # Pure utilities
│   ├── dateUtils.ts      # Date arithmetic
│   ├── geometry.ts       # Position calculations
│   └── validation.ts     # Input validation
├── types/                # TypeScript types
│   ├── index.ts
│   ├── task.ts
│   └── config.ts
└── __tests__/            # Test files
```

### Structure Rationale

- **components/**: Organized by feature, not type — keeps related code together
- **canvas/**: Isolated from React — pure functions for easier testing and optimization
- **hooks/**: Reusable stateful logic — follows React best practices
- **state/**: Centralized state management — clear data flow and easy debugging
- **utils/**: Pure functions — no side effects, easily testable

## Architectural Patterns

### Pattern 1: Canvas + DOM Hybrid

**What:** Use HTML5 Canvas for the main grid/task rendering, DOM for interactive elements (sidebar, headers)

**When to use:**
- Rendering 100+ tasks with smooth 60fps scrolling
- Complex visual elements (grid lines, dependencies)
- Need for custom drawing (arrows, highlights)

**Trade-offs:**
- Pros: Better performance for large datasets, full control over rendering
- Cons: Accessibility harder to implement, more complex hit testing

**Example:**
```typescript
// Hybrid architecture with canvas for body, DOM for sidebar
const GanttChart: React.FC<GanttProps> = ({ tasks }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Canvas handles main grid and task bars
  useCanvasRenderer(canvasRef, tasks);

  // DOM handles sidebar (screen readers, keyboard nav)
  return (
    <div className="gantt-container">
      <div ref={sidebarRef} className="gantt-sidebar">
        <TaskList tasks={tasks} />
      </div>
      <canvas ref={canvasRef} className="gantt-canvas" />
    </div>
  );
};
```

### Pattern 2: Virtualized Rendering

**What:** Only render visible elements using windowing techniques

**When to use:**
- Large datasets (1000+ tasks)
- Performance is critical
- Limited screen real estate

**Trade-offs:**
- Pros: Constant render time regardless of dataset size
- Cons: More complex implementation, scroll position management

**Example:**
```typescript
import { VariableSizeList } from 'react-window';

const VirtualizedTaskList: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const getItemSize = (index: number) => {
    // Dynamic row height based on task content
    return tasks[index].height || 40;
  };

  return (
    <VariableSizeList
      height={600}
      itemCount={tasks.length}
      itemSize={getItemSize}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <TaskRow task={tasks[index]} />
        </div>
      )}
    </VariableSizeList>
  );
};
```

### Pattern 3: Compound Component Pattern

**What:** Parent component manages state, children receive context

**When to use:**
- Flexible API required
- Users need customization
- Multiple layout variations

**Trade-offs:**
- Pros: Flexible API, controlled complexity
- Cons: More boilerplate, harder to optimize

**Example:**
```typescript
// Compound components sharing state via context
const GanttChart = ({ children, tasks }) => {
  const state = useGanttState(tasks);
  return (
    <GanttContext.Provider value={state}>
      {children}
    </GanttContext.Provider>
  );
};

GanttChart.Sidebar = () => {
  const { tasks } = useGanttContext();
  return <TaskList tasks={tasks} />;
};

GanttChart.Timeline = () => {
  const { viewState } = useGanttContext();
  return <TimeScale range={viewState.dateRange} />;
};

// Usage
<GanttChart tasks={myTasks}>
  <GanttChart.Sidebar />
  <GanttChart.Timeline />
</GanttChart>
```

### Pattern 4: Drag-and-Drop State Machine

**What:** Explicit state management for drag operations (idle, dragging, resizing)

**When to use:**
- Complex drag interactions
- Multiple drag types (move, resize, reorder)
- Need for conflict resolution

**Trade-offs:**
- Pros: Clear state transitions, easier debugging
- Cons: More code, steeper learning curve

**Example:**
```typescript
type DragState =
  | { type: 'idle' }
  | { type: 'dragging', taskId: string, startX: number, originalStart: Date }
  | { type: 'resizing', taskId: string, edge: 'left' | 'right', startX: number }
  | { type: 'reordering', taskId: string, targetIndex: number };

const useDragAndDrop = () => {
  const [state, setState] = useState<DragState>({ type: 'idle' });

  const handleMouseDown = (taskId: string, edge?: 'left' | 'right') => {
    if (edge) {
      setState({ type: 'resizing', taskId, edge, startX: mouseX });
    } else {
      setState({ type: 'dragging', taskId, startX: mouseX, originalStart });
    }
  };

  const handleMouseMove = (mouseX: number) => {
    if (state.type === 'dragging') {
      const delta = mouseX - state.startX;
      // Update task position based on delta
    }
  };

  return { state, handlers: { handleMouseDown, handleMouseMove } };
};
```

## Data Flow

### Request Flow

```
[User Interaction: Drag Task Bar]
    ↓
[TaskBar Component] → [DnDManager.onMouseDown]
    ↓                    ↓
[Canvas Hit Test]  [State: { type: 'dragging', ... }]
    ↓                    ↓
[Update: newX] → [GeometryEngine.pixelToDate()]
    ↓                    ↓
[Dispatch Action] → [Reducer: UPDATE_TASK_DATE]
    ↓                    ↓
[New State] → [React Context Update]
    ↓
[Re-render Canvas] → [requestAnimationFrame Loop]
```

### State Management

```
[GanttContext Provider]
    ↓ (subscribe)
[Components] ←→ [Actions] → [Reducers] → [State Update]
    ↓                                          ↓
[Props/Sync] ←───────────────────────────── [New Render]
```

### Key Data Flows

1. **Initial Render:** Props → Context → Canvas Render
   - Tasks passed as props
   - Context initializes state
   - Canvas draws initial frame

2. **Drag Operation:** MouseDown → DnDManager → State Update → Canvas Redraw
   - Hit detection identifies target
   - DnDManager tracks drag state
   - Each mouse move triggers state update
   - Canvas redraws on animation frame

3. **Scroll Sync:** Scroll Event → Position Update → Multiple Components
   - Scroll listener on canvas
   - New scroll position updates context
   - TimeScale and TaskList reposition
   - Canvas viewport recalculates

4. **Task Selection:** Click → SelectionManager → State Update → Visual Feedback
   - Click event with task ID
   - Selection updates set
   - Canvas highlights selected
   - Sidebar updates styling

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 tasks | Simple DOM rendering suffices; canvas optional |
| 100-1000 tasks | Canvas rendering essential; implement virtualization for sidebar |
| 1000+ tasks | Full virtualization; consider web workers for calculations; incremental rendering |

### Scaling Priorities

1. **First bottleneck: Canvas rendering at 100+ tasks**
   - Implement dirty rectangle rendering (only redraw changed regions)
   - Use requestAnimationFrame batching
   - Optimize draw calls (batch similar operations)

2. **Second bottleneck: State updates during drag**
   - Throttle state updates during drag operations
   - Use immer for efficient immutable updates
   - Consider local component state during drag, sync on complete

3. **Third bottleneck: Sidebar rendering**
   - Implement virtualization for task list
   - Defer rendering of off-screen rows
   - Use React.memo for row components

## Anti-Patterns

### Anti-Pattern 1: Everything in Canvas

**What people do:** Render entire UI (including sidebar) in single canvas

**Why it's wrong:** Loses accessibility, keyboard navigation, screen reader support

**Do this instead:** Hybrid approach — DOM for interactive UI, canvas for data-heavy grid

### Anti-Pattern 2: Direct DOM Manipulation

**What people do:** Bypass React and manipulate DOM directly for performance

**Why it's wrong:** Breaks React's rendering model, causes sync issues

**Do this instead:** Use refs for canvas, let React handle DOM state

### Anti-Pattern 3: Monolithic Component

**What people do:** Single 2000-line component handling everything

**Why it's wrong:** Unmaintainable, hard to test, no reusability

**Do this instead:** Break into focused components with clear responsibilities

### Anti-Pattern 4: Props Drilling

**What people do:** Pass data through 5+ component layers

**Why it's wrong:** Fragile, hard to refactor, performance issues

**Do this instead:** React Context for shared state, composition for layout

## Integration Points

### External Libraries

| Library | Integration Pattern | Notes |
|---------|---------------------|-------|
| dnd-kit | Use for sidebar reordering | Canvas still needs custom DnD implementation |
| react-window | Virtualize sidebar component | Coordinate scroll position with canvas |
| date-fns | Date utilities throughout | Wrap with custom domain-specific helpers |
| immer | Efficient state updates | Use in reducers for task mutations |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Canvas ↔ React | Refs + Callbacks | Canvas is imperative, React is declarative — bridge carefully |
| Components ↔ State | Context + Selectors | Unidirectional flow; components don't mutate state directly |
| Utils ↔ Components | Pure function imports | No side effects in utils; easy to test |

## Build Order Implications

Based on component dependencies and architecture:

1. **Foundation First (Data Layer)**
   - Types and interfaces
   - Date utilities and geometry engine
   - State management setup

2. **Rendering Core**
   - Canvas coordinate system
   - Grid renderer
   - Task renderer

3. **Basic Components**
   - GanttContainer with context
   - TaskList (simpler, DOM-based)
   - TimeScale header

4. **Interactions**
   - Selection manager
   - DnD manager (move, resize)
   - Scroll synchronization

5. **Advanced Features**
   - Dependencies rendering
   - Virtualization (if needed)
   - Performance optimizations

## Sources

- **Established React patterns** (confidence: HIGH — based on React documentation and community best practices)
- **Canvas rendering best practices** (confidence: MEDIUM — web search was rate-limited, based on general knowledge)
- **dnd-kit architecture** (confidence: LOW — unable to verify current documentation due to rate limits)
- **Virtualization patterns** (confidence: MEDIUM — based on react-window documentation and general React patterns)

---
*Architecture research for: React Gantt Chart Library*
*Researched: 2026-02-18*
