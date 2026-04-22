import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { capabilityCatalog } from './stories/capabilities/catalog';
import { exampleCatalog } from './stories/examples/catalog';

const packageRoot = resolve(import.meta.dirname, '..');

describe('storybook workspace boundaries', () => {
  it('declares required package scripts and storybook dependencies', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(packageRoot, 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      storybook: expect.any(String),
      'build-storybook': expect.any(String),
      build: expect.any(String),
      test: expect.any(String),
      lint: expect.any(String),
    });
    expect(packageJson.dependencies?.['gantt-lib']).toBe('*');
    expect(packageJson.devDependencies?.['@storybook/react']).toBeTruthy();
    expect(packageJson.devDependencies?.['@storybook/react-vite']).toBeTruthy();
  });

  it('keeps source imports on the public package surface only and loads required CSS', () => {
    const sourceFiles = [
      resolve(packageRoot, '.storybook/main.ts'),
      resolve(packageRoot, '.storybook/preview.ts'),
      resolve(packageRoot, 'src/stories/Scaffold.stories.tsx'),
      resolve(packageRoot, 'src/stories/StorybookScaffold.tsx'),
      resolve(packageRoot, 'src/stories/CapabilityStoryHarness.tsx'),
      resolve(packageRoot, 'src/stories/examples/ExampleScenarioHarness.tsx'),
      resolve(packageRoot, 'src/stories/fixtures/createStorybookTasks.ts'),
      resolve(packageRoot, 'src/stories/fixtures/createCapabilityTasks.ts'),
      resolve(packageRoot, 'src/stories/fixtures/createExampleScenarioTasks.ts'),
      ...capabilityCatalog.map((entry) =>
        resolve(packageRoot, 'src/stories/capabilities', entry.storyFile),
      ),
      ...exampleCatalog.map((entry) =>
        resolve(packageRoot, 'src/stories/examples', entry.storyFile),
      ),
    ];

    const forbiddenPatterns = [
      /packages\/website/,
      /packages\\website/,
      /packages\/gantt-lib\/src/,
      /packages\\gantt-lib\\src\\/,
      /from\s+['"]\.\.\/\.\.\/website/,
      /from\s+['"].*gantt-lib\/src\//,
      /from\s+['"]@\//,
    ];

    const previewContents = readFileSync(
      resolve(packageRoot, '.storybook/preview.ts'),
      'utf8',
    );
    expect(previewContents).toMatch(/import\s+['"]gantt-lib\/styles\.css['"]/);

    const storyContents = readFileSync(
      resolve(packageRoot, 'src/stories/Scaffold.stories.tsx'),
      'utf8',
    );
    expect(storyContents).toMatch(/from\s+['"]gantt-lib['"]/);

    for (const filePath of sourceFiles) {
      const contents = readFileSync(filePath, 'utf8');

      for (const forbiddenPattern of forbiddenPatterns) {
        expect(contents).not.toMatch(forbiddenPattern);
      }
    }
  });

  it('tracks the capability and example contract files that boundary checks should cover', () => {
    const trackedFiles = [
      resolve(packageRoot, 'src/stories/CapabilityStoryHarness.tsx'),
      resolve(packageRoot, 'src/stories/examples/ExampleScenarioHarness.tsx'),
      resolve(packageRoot, 'src/stories/fixtures/createCapabilityTasks.ts'),
      resolve(packageRoot, 'src/stories/fixtures/createExampleScenarioTasks.ts'),
      resolve(packageRoot, 'src/__tests__/capabilityCatalog.test.ts'),
      resolve(packageRoot, 'src/__tests__/exampleCatalog.test.ts'),
      resolve(packageRoot, 'src/stories/examples/catalog.ts'),
      resolve(packageRoot, 'src/workspace-boundaries.test.ts'),
      ...capabilityCatalog.map((entry) =>
        resolve(packageRoot, 'src/stories/capabilities', entry.storyFile),
      ),
      ...exampleCatalog.map((entry) =>
        resolve(packageRoot, 'src/stories/examples', entry.storyFile),
      ),
    ];

    for (const filePath of trackedFiles) {
      expect(existsSync(filePath), `Expected tracked contract file ${filePath} to exist.`).toBe(
        true,
      );
    }
  });

  it('covers final filtering, extension, imperative, and example boundary contracts in source', () => {
    const filteringContents = readFileSync(
      resolve(packageRoot, 'src/stories/capabilities/Filtering.stories.tsx'),
      'utf8',
    );
    expect(filteringContents).toContain("title: 'Capabilities/Filtering'");
    expect(filteringContents).toContain("filterMode: 'highlight'");
    expect(filteringContents).toContain("filterMode: 'hide'");
    expect(filteringContents).toContain('No such task');

    const extensionsContents = readFileSync(
      resolve(packageRoot, 'src/stories/capabilities/Extensions.stories.tsx'),
      'utf8',
    );
    expect(extensionsContents).toContain("title: 'Capabilities/Extensions'");
    expect(extensionsContents).toContain('TaskListColumn');
    expect(extensionsContents).toContain('TaskListMenuCommand');
    expect(extensionsContents).toContain("scope: 'group'");
    expect(extensionsContents).toContain("scope: 'linear'");
    expect(extensionsContents).toContain("scope: 'milestone'");

    const imperativeContents = readFileSync(
      resolve(packageRoot, 'src/stories/capabilities/ImperativeControls.stories.tsx'),
      'utf8',
    );
    expect(imperativeContents).toContain("title: 'Capabilities/Imperative controls'");
    expect(imperativeContents).toContain('scrollToToday');
    expect(imperativeContents).toContain('scrollToTask');
    expect(imperativeContents).toContain('scrollToRow');
    expect(imperativeContents).toContain('collapseAll');
    expect(imperativeContents).toContain('expandAll');
    expect(imperativeContents).not.toContain('exportToPdf');

    const programWorkspaceContents = readFileSync(
      resolve(packageRoot, 'src/stories/examples/ProgramWorkspace.stories.tsx'),
      'utf8',
    );
    expect(programWorkspaceContents).toContain("title: 'Examples/Program workspace'");
    expect(programWorkspaceContents).toContain('ExampleScenarioHarness');
    expect(programWorkspaceContents).toContain('createProgramWorkspaceScenario');

    const searchContents = readFileSync(
      resolve(packageRoot, 'src/stories/examples/SearchAndHighlight.stories.tsx'),
      'utf8',
    );
    expect(searchContents).toContain("title: 'Examples/Search and highlight'");
    expect(searchContents).toContain('ExampleScenarioHarness');
    expect(searchContents).toContain('createSearchAndHighlightScenario');

    const dependencyContents = readFileSync(
      resolve(packageRoot, 'src/stories/examples/DependencyControlCenter.stories.tsx'),
      'utf8',
    );
    expect(dependencyContents).toContain("title: 'Examples/Dependency control center'");
    expect(dependencyContents).toContain('ExampleScenarioHarness');
    expect(dependencyContents).toContain('createDependencyControlCenterScenario');
    expect(dependencyContents).toContain('createBusinessDayReviewScenario');

    const exampleHarnessContents = readFileSync(
      resolve(packageRoot, 'src/stories/examples/ExampleScenarioHarness.tsx'),
      'utf8',
    );
    expect(exampleHarnessContents).toContain('filteredTaskIds');
    expect(exampleHarnessContents).toContain('No menu command selected yet.');
    expect(exampleHarnessContents).toContain('Run focus ref action');
    expect(exampleHarnessContents).toContain('Collapse groups');

    const exampleFixtureContents = readFileSync(
      resolve(packageRoot, 'src/stories/fixtures/createExampleScenarioTasks.ts'),
      'utf8',
    );
    expect(exampleFixtureContents).toContain('createProgramWorkspaceScenario');
    expect(exampleFixtureContents).toContain('createSearchAndHighlightScenario');
    expect(exampleFixtureContents).toContain('createDependencyControlCenterScenario');
    expect(exampleFixtureContents).toContain('createBusinessDayReviewScenario');
  });
});
