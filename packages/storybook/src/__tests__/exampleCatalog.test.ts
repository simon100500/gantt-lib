import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  exampleCatalog,
  exampleSections,
  exampleStoryTitles,
} from '../stories/examples/catalog';

const packageRoot = resolve(import.meta.dirname, '../..');
const websiteSegment = ['packages', 'website'].join('/');
const internalSourceSegment = ['gantt-lib', 'src'].join('/');
const aliasPrefix = `from ${String.fromCharCode(39)}@${'/'}${String.fromCharCode(39)}`;
const capabilityPrefixPattern = /title:\s*['"]Capabilities\//;
const websiteImportPattern = new RegExp(`packages[\\/]${websiteSegment.split('/')[1]}`);
const internalSourcePattern = new RegExp(`${internalSourceSegment.replace('/', '\\/')}\\/`);
const aliasPattern = new RegExp(`from\\s+['"]@\\/`);

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
      'Management overview',
      'Searchable triage',
      'Extension workspace',
      'Operations review',
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

      expect(
        storyContents,
        `Expected ${entry.storyFile} to declare title ${entry.title}.`,
      ).toContain(`title: '${entry.title}'`);
      expect(
        storyContents,
        `Expected ${entry.storyFile} to use ExampleScenarioHarness.`,
      ).toContain('ExampleScenarioHarness');
      expect(
        storyContents,
        `Expected ${entry.storyFile} not to bypass the example wrapper.`,
      ).not.toContain('CapabilityStoryHarness');
      expect(
        storyContents,
        `Expected ${entry.storyFile} not to declare a Capabilities story title.`,
      ).not.toMatch(capabilityPrefixPattern);
      expect(
        storyContents,
        `Expected ${entry.storyFile} not to import from the website package.`,
      ).not.toMatch(websiteImportPattern);
      expect(
        storyContents,
        `Expected ${entry.storyFile} not to import from gantt-lib internals.`,
      ).not.toMatch(internalSourcePattern);
      expect(
        storyContents,
        `Expected ${entry.storyFile} not to use the root alias prefix ${aliasPrefix}.`,
      ).not.toMatch(aliasPattern);
    }

    expect(exampleStoryTitles).toEqual([
      'Examples/Management overview',
      'Examples/Searchable triage',
      'Examples/Extension workspace',
      'Examples/Operations review',
    ]);
  });

  it('covers the planned host-like scenario surfaces in source', () => {
    const exampleHarnessContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'examples', 'ExampleScenarioHarness.tsx'),
      'utf8',
    );
    expect(exampleHarnessContents).toContain('Host query control');
    expect(exampleHarnessContents).toContain('Clear query');
    expect(exampleHarnessContents).toContain('Reset query');
    expect(exampleHarnessContents).toContain('Run focus ref action');
    expect(exampleHarnessContents).toContain('Collapse groups');
    expect(exampleHarnessContents).toContain('Expand groups');
    expect(exampleHarnessContents).toContain('No menu command selected yet.');
    expect(exampleHarnessContents).toContain('No ref action triggered yet.');
    expect(exampleHarnessContents).toContain('visible match(es)');

    const fixtureContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'fixtures', 'createExampleScenarioTasks.ts'),
      'utf8',
    );
    expect(fixtureContents).toContain('createManagementOverviewScenario');
    expect(fixtureContents).toContain('createSearchableTriageScenario');
    expect(fixtureContents).toContain('createExtensionWorkspaceScenario');
    expect(fixtureContents).toContain('createOperationsReviewScenario');
    expect(fixtureContents).toContain('Queue exec brief is unsupported for non-milestone rows.');
    expect(fixtureContents).toContain('No rows match the active triage query.');
    expect(fixtureContents).toContain('Linear-only recovery actions reject milestone and group rows.');
    expect(fixtureContents).toContain('missing-task-id');

    const managementContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'examples', 'ManagementOverview.stories.tsx'),
      'utf8',
    );
    expect(managementContents).toContain('createManagementOverviewScenario');
    expect(managementContents).toContain("taskFilterQuery: 'Capability'");
    expect(managementContents).toContain("filterMode: 'highlight'");
    expect(managementContents).toContain("highlightedTaskIds: new Set(['cap-interaction', 'cap-deps'])");
    expect(managementContents).toContain('additionalColumns: managementOverviewColumns');
    expect(managementContents).toContain('taskListMenuCommands: managementOverviewCommands');

    const triageContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'examples', 'SearchableTriage.stories.tsx'),
      'utf8',
    );
    expect(triageContents).toContain('createSearchableTriageScenario');
    expect(triageContents).toContain("taskFilterQuery: 'Critical'");
    expect(triageContents).toContain("filterMode: 'highlight'");
    expect(triageContents).toContain("highlightedTaskIds: new Set(['cap-interaction', 'cap-deps'])");
    expect(triageContents).toContain('Clear query for no-match coverage');

    const extensionContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'examples', 'ExtensionWorkspace.stories.tsx'),
      'utf8',
    );
    expect(extensionContents).toContain('createExtensionWorkspaceScenario');
    expect(extensionContents).toContain("taskFilterQuery: 'dependency'");
    expect(extensionContents).toContain("filterMode: 'hide'");
    expect(extensionContents).toContain('additionalColumns: extensionWorkspaceColumns');
    expect(extensionContents).toContain('taskListMenuCommands: extensionWorkspaceCommands');

    const operationsContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'examples', 'OperationsReview.stories.tsx'),
      'utf8',
    );
    expect(operationsContents).toContain('createOperationsReviewScenario');
    expect(operationsContents).toContain("taskFilterQuery: 'Weekday'");
    expect(operationsContents).toContain('enableAutoSchedule: true');
    expect(operationsContents).toContain('businessDays: true');
    expect(operationsContents).toContain('missing-task-id');
  });
});
