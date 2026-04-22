import { useMemo, useState, type ReactNode } from 'react';
import type { TaskListMenuCommand } from 'gantt-lib';
import {
  CapabilityStoryHarness,
  type CapabilityToolbarContext,
} from '../CapabilityStoryHarness';
import type { CapabilityTask } from '../fixtures/createCapabilityTasks';
import type { ExampleScenarioDescriptor } from '../fixtures/createExampleScenarioTasks';

export interface ExampleScenarioHarnessProps {
  title: string;
  description: string;
  scenario: ExampleScenarioDescriptor;
  initialMenuFeedback?: string;
  initialRefFeedback?: string;
  extraToolbarContent?: ReactNode;
}

const getSupportedScopes = (task: CapabilityTask): Array<'group' | 'linear' | 'milestone' | 'all'> => {
  if ((task as { type?: string }).type === 'milestone') {
    return ['milestone', 'all'];
  }

  const isGroup = task.parentId == null;
  return isGroup ? ['group', 'all'] : ['linear', 'all'];
};

const isCommandSupportedForTask = (
  command: TaskListMenuCommand<CapabilityTask>,
  task: CapabilityTask,
): boolean => {
  const supportedScopes = getSupportedScopes(task);
  const scope = command.scope ?? 'all';

  return supportedScopes.includes(scope);
};

const formatTrackedIds = (ids: Set<string>): string => {
  if (ids.size === 0) {
    return 'none';
  }

  return Array.from(ids).join(', ');
};

export function ExampleScenarioHarness({
  title,
  description,
  scenario,
  initialMenuFeedback = 'No menu command selected yet.',
  initialRefFeedback,
  extraToolbarContent,
}: ExampleScenarioHarnessProps) {
  const [query, setQuery] = useState(scenario.query);
  const [menuFeedback, setMenuFeedback] = useState(initialMenuFeedback);
  const [refFeedback, setRefFeedback] = useState(
    initialRefFeedback ?? scenario.initialRefActionLabel ?? 'No ref action triggered yet.',
  );

  const filteredTaskIds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return new Set<string>();
    }

    return new Set(
      scenario.tasks
        .filter((task) => task.name.toLowerCase().includes(normalizedQuery))
        .map((task) => task.id),
    );
  }, [query, scenario.tasks]);

  const highlightedTaskIds = useMemo(() => {
    if (scenario.filterMode === 'highlight') {
      if (!query.trim()) {
        return new Set<string>(scenario.highlightedTaskIds);
      }

      return filteredTaskIds.size > 0
        ? new Set<string>([...scenario.highlightedTaskIds, ...filteredTaskIds])
        : new Set<string>(scenario.highlightedTaskIds);
    }

    return new Set<string>(scenario.highlightedTaskIds);
  }, [filteredTaskIds, query, scenario.filterMode, scenario.highlightedTaskIds]);

  const isFilterActive = query.trim().length > 0;
  const noMatch = isFilterActive && filteredTaskIds.size === 0;

  const taskListMenuCommands = useMemo(() => {
    return (scenario.taskListMenuCommands ?? []).map((command) => ({
      ...command,
      onSelect: (row: CapabilityTask) => {
        if (!isCommandSupportedForTask(command, row)) {
          setMenuFeedback(
            scenario.unsupportedCommandLabel ??
              `${command.label} is unsupported for ${row.id}. Scope: ${command.scope ?? 'all'}.`,
          );
          return;
        }

        command.onSelect(row);
        setMenuFeedback(`${command.label} executed for ${row.id}. Scope: ${command.scope ?? 'all'}.`);
      },
    }));
  }, [scenario.taskListMenuCommands, scenario.unsupportedCommandLabel]);

  const renderToolbar = (context: CapabilityToolbarContext) => {
    const runFocusAction = () => {
      if (!scenario.focusTaskId) {
        setRefFeedback('Focus action is not configured for this scenario.');
        return;
      }

      context.chartHandle?.scrollToTask(scenario.focusTaskId);
      setRefFeedback(`scrollToTask(${scenario.focusTaskId}) executed.`);
      context.announce(`Focused ${scenario.focusTaskId} from example scenario harness.`);
    };

    const runCollapseAction = () => {
      context.chartHandle?.collapseAll();
      setRefFeedback('collapseAll() executed.');
      context.announce('Collapsed all visible groups from example scenario harness.');
    };

    const runExpandAction = () => {
      context.chartHandle?.expandAll();
      setRefFeedback('expandAll() executed.');
      context.announce('Expanded all groups from example scenario harness.');
    };

    return (
      <div
        style={{
          display: 'grid',
          gap: '12px',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: '8px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          <StatusCard label="Scenario" value={scenario.diagnosticsLabel} />
          <StatusCard label="Query" value={query || '∅ empty query'} tone={query ? 'neutral' : 'warning'} />
          <StatusCard label="Filter mode" value={scenario.filterMode} />
          <StatusCard
            label="Tracked matches"
            value={isFilterActive ? `${filteredTaskIds.size} visible match(es)` : 'inactive'}
            tone={noMatch ? 'warning' : 'neutral'}
          />
          <StatusCard label="Highlights" value={formatTrackedIds(highlightedTaskIds)} />
          <StatusCard label="Menu feedback" value={menuFeedback} />
          <StatusCard label="Ref feedback" value={refFeedback} />
          <StatusCard label="Validation target" value={scenario.dependencyExpectation} />
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <label style={{ display: 'grid', gap: '4px', minWidth: '260px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Host query control</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type a query or clear for malformed-input coverage"
              style={{
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                padding: '10px 12px',
                font: 'inherit',
              }}
            />
          </label>
          <button type="button" onClick={() => setQuery('')}>
            Clear query
          </button>
          <button type="button" onClick={() => setQuery(scenario.query)}>
            Reset query
          </button>
          <button type="button" onClick={runFocusAction}>
            Run focus ref action
          </button>
          <button type="button" onClick={runCollapseAction}>
            Collapse groups
          </button>
          <button type="button" onClick={runExpandAction}>
            Expand groups
          </button>
          {extraToolbarContent}
        </div>

        {noMatch ? (
          <div
            style={{
              borderRadius: '12px',
              border: '1px solid #f59e0b',
              background: '#fffbeb',
              color: '#92400e',
              padding: '12px 14px',
            }}
          >
            {scenario.emptyStateLabel}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <CapabilityStoryHarness
      title={title}
      description={description}
      initialTasks={scenario.tasks}
      taskListWidth={840}
      filterMode={scenario.filterMode}
      taskFilterQuery={query}
      highlightedTaskIds={highlightedTaskIds}
      businessDays={scenario.businessDays}
      enableAutoSchedule={scenario.enableAutoSchedule}
      additionalColumns={scenario.additionalColumns}
      taskListMenuCommands={taskListMenuCommands}
      renderToolbar={renderToolbar}
    />
  );
}

function StatusCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'warning';
}) {
  return (
    <div
      style={{
        borderRadius: '14px',
        padding: '12px 14px',
        border: `1px solid ${tone === 'warning' ? '#f59e0b' : '#cbd5e1'}`,
        background: tone === 'warning' ? '#fffbeb' : 'rgba(255,255,255,0.92)',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: tone === 'warning' ? '#b45309' : '#64748b',
          marginBottom: '6px',
        }}
      >
        {label}
      </div>
      <div style={{ color: '#0f172a', fontSize: '13px', lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}
