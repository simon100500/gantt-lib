import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  capabilityCatalog,
  capabilitySections,
  capabilityStoryTitles,
} from '../stories/capabilities/catalog';

const packageRoot = resolve(import.meta.dirname, '../..');

describe('capability catalog contract', () => {
  it('keeps preview storySort aligned with Overview and capability sections', () => {
    const previewContents = readFileSync(
      resolve(packageRoot, '.storybook', 'preview.ts'),
      'utf8',
    );

    expect(previewContents).toContain("'Overview'");
    expect(previewContents).toContain("'Capabilities'");

    expect(previewContents).toContain('capabilitySections');
    expect(capabilitySections).toEqual([
      'Layout',
      'Task states',
      'Interaction',
      'Dependencies',
      'Filtering',
      'Extensions',
      'Imperative controls',
    ]);
  });

  it('declares capability story files under the Capabilities/* namespace', () => {
    expect(capabilityCatalog).toHaveLength(capabilitySections.length);

    for (const entry of capabilityCatalog) {
      const storyPath = resolve(
        packageRoot,
        'src',
        'stories',
        'capabilities',
        entry.storyFile,
      );

      expect(
        existsSync(storyPath),
        `Expected capability story file ${entry.storyFile} to exist.`,
      ).toBe(true);

      const storyContents = readFileSync(storyPath, 'utf8');

      expect(storyContents).toContain(`title: '${entry.title}'`);
      expect(storyContents).toMatch(/CapabilityStoryHarness/);
      expect(storyContents).not.toMatch(/packages[\\/]website/);
      expect(storyContents).not.toMatch(/gantt-lib\/src\//);
    }

    expect(capabilityStoryTitles).toEqual([
      'Capabilities/Layout',
      'Capabilities/Task states',
      'Capabilities/Interaction',
      'Capabilities/Dependencies',
      'Capabilities/Filtering',
      'Capabilities/Extensions',
      'Capabilities/Imperative controls',
    ]);
  });

  it('keeps capability fixtures local and covers required variants', () => {
    const fixtureContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'fixtures', 'createCapabilityTasks.ts'),
      'utf8',
    );

    for (const exportName of [
      'createCapabilityTasks',
      'createEmptyCapabilityTasks',
      'createChartOnlyCapabilityTasks',
      'createTaskListOnlyCapabilityTasks',
      'createDependencyFocusedCapabilityTasks',
      'createInvalidDependencyCapabilityTasks',
      'createFilteringCapabilityTasks',
      'createTaskStateCapabilityTasks',
      'createBusinessDayCapabilityTasks',
    ]) {
      expect(fixtureContents).toContain(exportName);
    }

    expect(fixtureContents).not.toMatch(/packages[\\/]website/);
    expect(fixtureContents).not.toMatch(/gantt-lib\/src\//);
    expect(fixtureContents).not.toMatch(/from\s+['"]@\//);
  });

  it('keeps the shared harness merge-by-id and interaction observability hooks in source', () => {
    const harnessContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'CapabilityStoryHarness.tsx'),
      'utf8',
    );

    expect(harnessContents).toContain('export const mergeChangedTasks');
    expect(harnessContents).toContain('changedTaskMap');
    expect(harnessContents).toContain('TaskListColumn');
    expect(harnessContents).toContain('TaskListMenuCommand');
    expect(harnessContents).toContain('GanttChartHandle');
    expect(harnessContents).toContain('ValidationResult');
    expect(harnessContents).toContain('filterMode');
    expect(harnessContents).toContain('chartHandle');
    expect(harnessContents).toContain('taskListMenuCommands');
    expect(harnessContents).toContain('onCascade');
    expect(harnessContents).toContain('collapsedParentIds');
    expect(harnessContents).toContain('Dependency validation');
    expect(harnessContents).toContain('nameContains');
    expect(harnessContents).not.toMatch(/packages[\\/]website/);
    expect(harnessContents).not.toMatch(/gantt-lib\/src\//);
  });

  it('covers the planned layout, task-state, interaction, dependency, filtering, extension, and ref surfaces', () => {
    const layoutContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'capabilities', 'Layout.stories.tsx'),
      'utf8',
    );
    expect(layoutContents).toContain('showTaskList: false');
    expect(layoutContents).toContain('showChart: false');
    expect(layoutContents).toContain("viewMode: 'month'");
    expect(layoutContents).toContain("viewMode: 'week'");
    expect(layoutContents).toContain("initiallyCollapsedParentIds: ['cap-program']");

    const taskStateContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'capabilities', 'TaskStates.stories.tsx'),
      'utf8',
    );
    expect(taskStateContents).toContain('showBaseline: false');
    expect(taskStateContents).toContain("highlightedTaskIds: new Set(['cap-states', 'cap-deps'])");

    const interactionContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'capabilities', 'Interaction.stories.tsx'),
      'utf8',
    );
    expect(interactionContents).toContain('disableTaskNameEditing: true');
    expect(interactionContents).toContain('disableTaskDrag: true');
    expect(interactionContents).toContain('businessDays: true');
    expect(interactionContents).toContain('businessDays: false');

    const dependencyContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'capabilities', 'Dependencies.stories.tsx'),
      'utf8',
    );
    expect(dependencyContents).toContain('enableAutoSchedule: true');
    expect(dependencyContents).toContain('disableConstraints: false');
    expect(dependencyContents).toContain('disableConstraints: true');
    expect(dependencyContents).toContain('createInvalidDependencyCapabilityTasks');

    const filteringContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'capabilities', 'Filtering.stories.tsx'),
      'utf8',
    );
    expect(filteringContents).toContain("filterMode: 'highlight'");
    expect(filteringContents).toContain("filterMode: 'hide'");
    expect(filteringContents).toContain("taskFilterQuery: 'Critical'");
    expect(filteringContents).toContain("taskFilterQuery: 'No such task'");
    expect(filteringContents).toContain("taskFilterQuery: ''");

    const extensionsContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'capabilities', 'Extensions.stories.tsx'),
      'utf8',
    );
    expect(extensionsContents).toContain('TaskListColumn');
    expect(extensionsContents).toContain('TaskListMenuCommand');
    expect(extensionsContents).toContain('renderEditor');
    expect(extensionsContents).toContain("scope: 'group'");
    expect(extensionsContents).toContain("scope: 'linear'");
    expect(extensionsContents).toContain("scope: 'milestone'");
    expect(extensionsContents).toContain('mergeChangedTasks');

    const imperativeContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'capabilities', 'ImperativeControls.stories.tsx'),
      'utf8',
    );
    expect(imperativeContents).toContain('scrollToToday');
    expect(imperativeContents).toContain('scrollToTask');
    expect(imperativeContents).toContain('scrollToRow');
    expect(imperativeContents).toContain('collapseAll');
    expect(imperativeContents).toContain('expandAll');
    expect(imperativeContents).not.toContain('exportToPdf');
  });
});
