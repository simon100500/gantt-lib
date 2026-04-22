import type { Meta, StoryObj } from '@storybook/react';
import { ExampleScenarioHarness } from './ExampleScenarioHarness';
import {
  createExtensionWorkspaceScenario,
  extensionWorkspaceColumns,
  extensionWorkspaceCommands,
} from '../fixtures/createExampleScenarioTasks';

const meta = {
  title: 'Examples/Extension workspace',
  component: ExampleScenarioHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Integration-focused workspace that demonstrates additional columns, row-scoped menu commands, dependency visibility, and hide-mode filtering.',
      },
    },
  },
} satisfies Meta<typeof ExampleScenarioHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const IntegrationCommandCenter: Story = {
  args: {
    title: 'Examples / extension workspace',
    description:
      'Shows how a host can combine custom task-list columns, scoped menu commands, dependency-focused filtering, and ref feedback without touching internal sources.',
    scenario: createExtensionWorkspaceScenario(),
    extraToolbarContent: (
      <>
        <span>taskFilterQuery: 'dependency'</span>
        <span>filterMode: 'hide'</span>
        <span>additionalColumns: extensionWorkspaceColumns</span>
        <span>taskListMenuCommands: extensionWorkspaceCommands</span>
        <span>Run host command audit</span>
      </>
    ),
  },
};

void extensionWorkspaceColumns;
void extensionWorkspaceCommands;
