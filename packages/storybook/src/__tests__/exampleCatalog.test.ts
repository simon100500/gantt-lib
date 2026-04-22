import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  exampleCatalog,
  exampleSections,
  exampleStoryTitles,
} from '../stories/examples/catalog';

const packageRoot = resolve(import.meta.dirname, '../..');

describe('example catalog contract', () => {
  it('keeps preview storySort aligned with the dedicated Examples section order', () => {
    const previewContents = readFileSync(
      resolve(packageRoot, '.storybook', 'preview.ts'),
      'utf8',
    );

    expect(previewContents).toContain("'Capabilities'");
    expect(previewContents).toContain("'Examples'");
    expect(previewContents).toContain('exampleSections');
    expect(previewContents.indexOf("'Examples'")).toBeGreaterThan(
      previewContents.indexOf("'Capabilities'"),
    );

    expect(exampleSections).toEqual([
      'Program workspace',
      'Search and highlight',
      'Dependency control center',
    ]);
  });

  it('declares example story files under the Examples/* namespace', () => {
    expect(exampleCatalog).toHaveLength(exampleSections.length);

    for (const entry of exampleCatalog) {
      const storyPath = resolve(packageRoot, 'src', 'stories', 'examples', entry.storyFile);

      expect(
        existsSync(storyPath),
        `Expected example story file ${entry.storyFile} to exist.`,
      ).toBe(true);

      const storyContents = readFileSync(storyPath, 'utf8');

      expect(storyContents).toContain(`title: '${entry.title}'`);
      expect(storyContents).toContain('CapabilityStoryHarness');
      expect(storyContents).not.toMatch(/title:\s*['"]Capabilities\//);
      expect(storyContents).not.toMatch(/packages[\\/]website/);
      expect(storyContents).not.toMatch(/gantt-lib\/src\//);
      expect(storyContents).not.toMatch(/from\s+['"]@\//);
    }

    expect(exampleStoryTitles).toEqual([
      'Examples/Program workspace',
      'Examples/Search and highlight',
      'Examples/Dependency control center',
    ]);
  });

  it('covers the planned host-like scenario surfaces in source', () => {
    const programWorkspaceContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'examples', 'ProgramWorkspace.stories.tsx'),
      'utf8',
    );
    expect(programWorkspaceContents).toContain('taskFilterQuery: \'Capability\'');
    expect(programWorkspaceContents).toContain('filterMode: \'highlight\'');
    expect(programWorkspaceContents).toContain("highlightedTaskIds: new Set(['cap-interaction', 'cap-deps'])");
    expect(programWorkspaceContents).toContain('additionalColumns: programColumns');
    expect(programWorkspaceContents).toContain('taskListMenuCommands: programCommands');
    expect(programWorkspaceContents).toContain('Capture workspace status');

    const searchContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'examples', 'SearchAndHighlight.stories.tsx'),
      'utf8',
    );
    expect(searchContents).toContain('taskFilterQuery: \'Critical\'');
    expect(searchContents).toContain('filterMode: \'highlight\'');
    expect(searchContents).toContain("highlightedTaskIds: new Set(['cap-interaction', 'cap-deps'])");
    expect(searchContents).toContain('businessDays: true');
    expect(searchContents).toContain('Announce triage focus');

    const dependencyContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'examples', 'DependencyControlCenter.stories.tsx'),
      'utf8',
    );
    expect(dependencyContents).toContain('createDependencyFocusedCapabilityTasks');
    expect(dependencyContents).toContain('createBusinessDayCapabilityTasks');
    expect(dependencyContents).toContain('enableAutoSchedule: true');
    expect(dependencyContents).toContain('businessDays: false');
    expect(dependencyContents).toContain('businessDays: true');
    expect(dependencyContents).toContain('scrollToTask');
    expect(dependencyContents).toContain('collapseAll');
  });
});
