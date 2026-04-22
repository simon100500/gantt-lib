import { useMemo, useState } from 'react';
import { GanttChart, type Task } from 'gantt-lib';
import { createStorybookTasks } from './fixtures/createStorybookTasks';

export interface StorybookScaffoldProps {
  initialTasks?: Task[];
}

const mergeChangedTasks = (sourceTasks: Task[], changedTasks: Task[]): Task[] => {
  if (changedTasks.length === 0) {
    return sourceTasks;
  }

  const changedTaskMap = new Map(changedTasks.map((task) => [task.id, task]));

  return sourceTasks.map((task) => changedTaskMap.get(task.id) ?? task);
};

export function StorybookScaffold({
  initialTasks = createStorybookTasks(),
}: StorybookScaffoldProps) {
  const [tasks, setTasks] = useState(initialTasks);

  const sortedTasks = useMemo(() => tasks, [tasks]);

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
          maxWidth: '1200px',
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
            gantt-lib / public package surface
          </p>
          <h1
            style={{
              margin: '8px 0 4px',
              fontSize: '28px',
              lineHeight: 1.1,
              color: '#0f172a',
            }}
          >
            Baseline Storybook scaffold
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: '720px',
              color: '#334155',
            }}
          >
            This story keeps fixtures inside the Storybook workspace and renders
            the chart through the published gantt-lib API plus the required CSS
            contract.
          </p>
        </header>

        <GanttChart
          tasks={sortedTasks}
          dayWidth={44}
          rowHeight={40}
          headerHeight={48}
          containerHeight={420}
          showTaskList
          taskListWidth={360}
          showBaseline
          onTasksChange={(changedTasks) => {
            setTasks((currentTasks) => mergeChangedTasks(currentTasks, changedTasks));
          }}
        />
      </div>
    </div>
  );
}
