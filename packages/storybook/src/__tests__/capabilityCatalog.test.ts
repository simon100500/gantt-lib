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
      'createFilteringCapabilityTasks',
    ]) {
      expect(fixtureContents).toContain(exportName);
    }

    expect(fixtureContents).not.toMatch(/packages[\\/]website/);
    expect(fixtureContents).not.toMatch(/gantt-lib\/src\//);
    expect(fixtureContents).not.toMatch(/from\s+['"]@\//);
  });

  it('keeps the shared harness merge-by-id and extension/ref hooks in source', () => {
    const harnessContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'CapabilityStoryHarness.tsx'),
      'utf8',
    );

    expect(harnessContents).toContain('export const mergeChangedTasks');
    expect(harnessContents).toContain('changedTaskMap');
    expect(harnessContents).toContain('TaskListColumn');
    expect(harnessContents).toContain('GanttChartHandle');
    expect(harnessContents).toContain('nameContains');
    expect(harnessContents).not.toMatch(/packages[\\/]website/);
    expect(harnessContents).not.toMatch(/gantt-lib\/src\//);
  });
});
