import { type Task } from 'gantt-lib';
import { CapabilityStoryHarness } from './CapabilityStoryHarness';
import { createStorybookTasks } from './fixtures/createStorybookTasks';

export interface StorybookScaffoldProps {
  initialTasks?: Task[];
}

export function StorybookScaffold({
  initialTasks = createStorybookTasks(),
}: StorybookScaffoldProps) {
  return (
    <CapabilityStoryHarness
      title="Baseline Storybook scaffold"
      description="This story keeps fixtures inside the Storybook workspace and renders the chart through the published gantt-lib API plus the required CSS contract."
      initialTasks={initialTasks}
      showTaskList
      showChart
      taskListWidth={360}
    />
  );
}
