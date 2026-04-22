import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  GanttChart,
  type GanttChartHandle,
  type TaskListColumn,
  type ValidationResult,
} from 'gantt-lib';
import { nameContains } from 'gantt-lib/filters';
import {
  createCapabilityTasks,
  type CapabilityTask,
} from './fixtures/createCapabilityTasks';

export interface CapabilityToolbarContext {
  chartHandle: GanttChartHandle | null;
  collapsedParentIds: Set<string>;
  dependencyValidation: ValidationResult;
  lastEvent: string;
}

export interface CapabilityStoryHarnessProps {
  title?: string;
  description?: string;
  initialTasks?: CapabilityTask[];
  showTaskList?: boolean;
  showChart?: boolean;
  showBaseline?: boolean;
  taskListWidth?: number;
  viewMode?: 'day' | 'week' | 'month';
  businessDays?: boolean;
  disableTaskNameEditing?: boolean;
  disableDependencyEditing?: boolean;
  disableTaskDrag?: boolean;
  disableConstraints?: boolean;
  enableAutoSchedule?: boolean;
  enableAddTask?: boolean;
  highlightedTaskIds?: Set<string>;
  taskFilterQuery?: string;
  initiallyCollapsedParentIds?: string[];
  additionalColumns?: TaskListColumn<CapabilityTask>[];
  renderToolbar?: (context: CapabilityToolbarContext) => ReactNode;
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

const EMPTY_VALIDATION: ValidationResult = {
  isValid: true,
  errors: [],
};

export function CapabilityStoryHarness({
  title = 'Capability harness',
  description = 'Reusable Storybook surface for layout, state, interaction, dependency, filtering, extension, and ref-oriented stories.',
  initialTasks = createCapabilityTasks(),
  showTaskList = true,
  showChart = true,
  showBaseline = true,
  taskListWidth = 420,
  viewMode = 'day',
  businessDays = true,
  disableTaskNameEditing = false,
  disableDependencyEditing = false,
  disableTaskDrag = false,
  disableConstraints = false,
  enableAutoSchedule = false,
  enableAddTask = true,
  highlightedTaskIds,
  taskFilterQuery,
  initiallyCollapsedParentIds,
  additionalColumns,
  renderToolbar,
}: CapabilityStoryHarnessProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<string>>(
    () => new Set(initiallyCollapsedParentIds ?? []),
  );
  const [lastEvent, setLastEvent] = useState('Ready for interaction.');
  const [dependencyValidation, setDependencyValidation] =
    useState<ValidationResult>(EMPTY_VALIDATION);
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
  const toolbarContext = useMemo<CapabilityToolbarContext>(
    () => ({
      chartHandle: chartRef.current,
      collapsedParentIds,
      dependencyValidation,
      lastEvent,
    }),
    [collapsedParentIds, dependencyValidation, lastEvent],
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
            {renderToolbar(toolbarContext)}
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <StatusBadge label="View" value={viewMode} />
          <StatusBadge
            label="Surface"
            value={showTaskList && showChart ? 'split' : showTaskList ? 'list-only' : 'chart-only'}
          />
          <StatusBadge label="Baseline" value={showBaseline ? 'visible' : 'hidden'} />
          <StatusBadge label="Business days" value={businessDays ? 'on' : 'calendar'} />
          <StatusBadge label="Last event" value={lastEvent} />
          <StatusBadge
            label="Validation"
            value={dependencyValidation.isValid ? 'clean' : `${dependencyValidation.errors.length} issue(s)`}
            tone={dependencyValidation.isValid ? 'neutral' : 'warning'}
          />
        </div>

        {!dependencyValidation.isValid ? (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: '#fff7ed',
              border: '1px solid #fdba74',
              color: '#9a3412',
            }}
          >
            <strong>Dependency validation:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
              {dependencyValidation.errors.map((error) => (
                <li key={`${error.type}:${error.taskId}:${error.message}`}>
                  {error.type} · {error.taskId} · {error.message}
                </li>
              ))}
            </ul>
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
          showBaseline={showBaseline}
          taskListWidth={taskListWidth}
          viewMode={viewMode}
          additionalColumns={resolvedColumns}
          taskFilter={taskFilter}
          highlightedTaskIds={highlightedTaskIds}
          businessDays={businessDays}
          disableTaskNameEditing={disableTaskNameEditing}
          disableDependencyEditing={disableDependencyEditing}
          disableTaskDrag={disableTaskDrag}
          disableConstraints={disableConstraints}
          enableAutoSchedule={enableAutoSchedule}
          enableAddTask={enableAddTask}
          collapsedParentIds={collapsedParentIds}
          onToggleCollapse={(parentId) => {
            setCollapsedParentIds((currentIds) => {
              const nextIds = new Set(currentIds);
              if (nextIds.has(parentId)) {
                nextIds.delete(parentId);
                setLastEvent(`Expanded ${parentId}.`);
              } else {
                nextIds.add(parentId);
                setLastEvent(`Collapsed ${parentId}.`);
              }
              return nextIds;
            });
          }}
          onValidateDependencies={(result) => {
            setDependencyValidation(result);
            setLastEvent(
              result.isValid
                ? 'Dependency validation passed.'
                : `Dependency validation reported ${result.errors.length} issue(s).`,
            );
          }}
          onTasksChange={(changedTasks) => {
            setTasks((currentTasks) => mergeChangedTasks(currentTasks, changedTasks));
            setLastEvent(`Merged ${changedTasks.length} changed task(s) via onTasksChange.`);
          }}
          onCascade={(changedTasks) => {
            setTasks((currentTasks) => mergeChangedTasks(currentTasks, changedTasks));
            setLastEvent(`Merged ${changedTasks.length} cascaded task(s) via onCascade.`);
          }}
        />
      </div>
    </div>
  );
}

function StatusBadge({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'warning';
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        gap: '6px',
        alignItems: 'center',
        padding: '6px 10px',
        borderRadius: '999px',
        background: tone === 'warning' ? '#fff7ed' : 'rgba(255,255,255,0.85)',
        border: `1px solid ${tone === 'warning' ? '#fdba74' : '#cbd5e1'}`,
        color: tone === 'warning' ? '#9a3412' : '#334155',
        fontSize: '12px',
      }}
    >
      <strong>{label}:</strong>
      <span>{value}</span>
    </span>
  );
}
