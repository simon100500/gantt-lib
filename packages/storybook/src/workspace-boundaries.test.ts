import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { capabilityCatalog } from './stories/capabilities/catalog';

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
      resolve(packageRoot, 'src/stories/fixtures/createStorybookTasks.ts'),
      resolve(packageRoot, 'src/stories/fixtures/createCapabilityTasks.ts'),
      ...capabilityCatalog.map((entry) =>
        resolve(packageRoot, 'src/stories/capabilities', entry.storyFile),
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

  it('tracks the capability contract files that boundary checks should cover', () => {
    const trackedFiles = [
      resolve(packageRoot, 'src/stories/CapabilityStoryHarness.tsx'),
      resolve(packageRoot, 'src/stories/fixtures/createCapabilityTasks.ts'),
      resolve(packageRoot, 'src/__tests__/capabilityCatalog.test.ts'),
      ...capabilityCatalog.map((entry) =>
        resolve(packageRoot, 'src/stories/capabilities', entry.storyFile),
      ),
    ];

    for (const filePath of trackedFiles) {
      expect(existsSync(filePath), `Expected tracked capability file ${filePath} to exist.`).toBe(
        true,
      );
    }
  });
});
