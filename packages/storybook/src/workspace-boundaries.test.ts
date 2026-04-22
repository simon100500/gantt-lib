import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = resolve(import.meta.dirname, '..');

describe('storybook workspace boundaries', () => {
  it('declares required package scripts', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(packageRoot, 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      storybook: expect.any(String),
      'build-storybook': expect.any(String),
      build: expect.any(String),
      test: expect.any(String),
      lint: expect.any(String),
    });
    expect(packageJson.dependencies?.['gantt-lib']).toBe('*');
  });

  it('keeps source imports on the public package surface only', () => {
    const sourceFiles = [
      resolve(packageRoot, '.storybook/main.ts'),
      resolve(packageRoot, '.storybook/preview.ts'),
      resolve(packageRoot, 'src/Placeholder.stories.tsx'),
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

    for (const filePath of sourceFiles) {
      const contents = readFileSync(filePath, 'utf8');

      for (const forbiddenPattern of forbiddenPatterns) {
        expect(contents).not.toMatch(forbiddenPattern);
      }
    }
  });
});
