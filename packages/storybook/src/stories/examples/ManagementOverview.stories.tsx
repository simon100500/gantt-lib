import type { Meta, StoryObj } from '@storybook/react';
import { ExampleScenarioHarness } from './ExampleScenarioHarness';
import {
  createManagementOverviewScenario,
  managementOverviewColumns,
  managementOverviewCommands,
} from '../fixtures/createExampleScenarioTasks';

const meta = {
  title: 'Examples/Management overview',
  component: ExampleScenarioHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Host-like management overview that combines filters, highlights, additional columns, and scoped menu commands through the reusable example wrapper.',
      },
    },
  },
} satisfies Meta<typeof ExampleScenarioHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PortfolioReviewBoard: Story = {
  args: {
    title: 'Examples / management overview',
    description:
      'Combines PM-style host chrome, query diagnostics, highlight state, task-list extensions, and menu command feedback in a single review board.',
    scenario: createManagementOverviewScenario(),
    extraToolbarContent: (
      <>
        <span>taskFilterQuery: 'Capability'</span>
        <span>filterMode: 'highlight'</span>
        <span>highlightedTaskIds: new Set(['cap-interaction', 'cap-deps'])</span>
        <span>additionalColumns: managementOverviewColumns</span>
        <span>taskListMenuCommands: managementOverviewCommands</span>
        <span>Capture management pulse</span>
      </>
    ),
  },
};

void managementOverviewColumns;
void managementOverviewCommands;
