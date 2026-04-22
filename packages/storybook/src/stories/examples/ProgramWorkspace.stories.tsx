import type { Meta, StoryObj } from '@storybook/react';
import { ExampleScenarioHarness } from './ExampleScenarioHarness';
import {
  createProgramWorkspaceScenario,
  programWorkspaceColumns,
  programWorkspaceCommands,
} from '../fixtures/createExampleScenarioTasks';

const meta = {
  title: 'Examples/Program workspace',
  component: ExampleScenarioHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Host-like management workspace composition backed by the reusable ExampleScenarioHarness and tracked scenario fixtures.',
      },
    },
  },
} satisfies Meta<typeof ExampleScenarioHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ManagementReviewWorkspace: Story = {
  args: {
    title: 'Examples / management review workspace',
    description:
      'Combines PM-style host chrome, highlight/hide diagnostics, task-list extensions, and menu command feedback through the shared example wrapper.',
    scenario: createProgramWorkspaceScenario(),
    extraToolbarContent: (
      <>
        <span>taskFilterQuery: 'Capability'</span>
        <span>filterMode: 'highlight'</span>
        <span>highlightedTaskIds: new Set(['cap-interaction', 'cap-deps'])</span>
        <span>additionalColumns: programColumns</span>
        <span>taskListMenuCommands: programCommands</span>
        <span>Capture workspace status</span>
      </>
    ),
  },
};

void programWorkspaceColumns;
void programWorkspaceCommands;
