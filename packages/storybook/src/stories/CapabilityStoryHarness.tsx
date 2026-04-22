import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  GanttChart,
  type GanttChartHandle,
  type TaskListColumn,
} from 'gantt-lib';
import { nameContains } from 'gantt-lib/filters';
import {
  createCapabilityTasks,
  type CapabilityTask,
} from './fixtures/createCapabilityTasks';

export interface CapabilityStoryHarnessProps {
  title?: string;
  description?: string;
  initialTasks?: CapabilityTask[];
  showTaskList?: boolean;
  showChart?: boolean;
  taskListWidth?: number;
  highlightedTaskIds?: Set<string>;
  taskFilterQuery?: string;
  additionalColumns?: TaskListColumn<CapabilityTask>[];
  renderToolbar?: (handle: GanttChartHandle | null) => ReactNode;
}

export const mergeChangedTasks = <TTask extends { id: string }>(
  sourceTasks: TTask[],
  changedTasks: TTask[],
): TTask[] => {
  if (changedTasks.length === 0) {
    return sourceTasks;
  }

  const changedTaskMap = new Map(changedTasks.map((task) => [task.id, task]));

  return sourceTasks.map((task) => changedTaskMap.get(task.id) ?? task);
};

const capabilityColumns: TaskListColumn<CapabilityTask>[] = [
  {
    id: 'owner',
    header: 'Owner',
    width: 120,
    after: 'name',
    renderCell: ({ task }) => task.owner ?? '—',
  },
  {
    id: 'status',
    header: 'Status',
    width: 120,
    after: 'progress',
    renderCell: ({ task }) => task.statusLabel ?? '—',
  },
];

export function CapabilityStoryHarness({
  title = 'Capability harness',
  description = 'Reusable Storybook surface for layout, state, interaction, dependency, filtering, extension, and ref-oriented stories.',
  initialTasks = createCapabilityTasks(),
  showTaskList = true,
  showChart = true,
  taskListWidth = 420,
  highlightedTaskIds,
  taskFilterQuery,
  additionalColumns,
  renderToolbar,
}: CapabilityStoryHarnessProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const chartRef = useRef<GanttChartHandle>(null);

  const sortedTasks = useMemo(() => tasks, [tasks]);
  const taskFilter = useMemo(
    () => (taskFilterQuery ? nameContains(taskFilterQuery) : undefined),
    [taskFilterQuery],
  );
  const resolvedColumns = useMemo(
    () => [...capabilityColumns, ...(additionalColumns ?? [])],
    [additionalColumns],
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '24px',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
      }}
    >
      <div
        style={{
          maxWidth: '1320px',
          margin: '0 auto',
          display: 'grid',
          gap: '16px',
        }}
      >
        <header>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#4f46e5',
            }}
          >
            gantt-lib / capability catalog
          </p>
          <h1
            style={{
              margin: '8px 0 4px',
              fontSize: '28px',
              lineHeight: 1.1,
              color: '#0f172a',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: '760px',
              color: '#334155',
            }}
          >
            {description}
          </p>
        </header>

        {renderToolbar ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            {renderToolbar(chartRef.current)}
          </div>
        ) : null}

        <GanttChart<CapabilityTask>
          ref={chartRef}
          tasks={sortedTasks}
          dayWidth={44}
          rowHeight={40}
          headerHeight={48}
          containerHeight={460}
          showTaskList={showTaskList}
          showChart={showChart}
          taskListWidth={taskListWidth}
          showBaseline
          additionalColumns={resolvedColumns}
          taskFilter={taskFilter}
          highlightedTaskIds={highlightedTaskIds}
          onTasksChange={(changedTasks) => {
            setTasks((currentTasks) => mergeChangedTasks(currentTasks, changedTasks));
          }}
        />
      </div>
    </div>
  );
}
