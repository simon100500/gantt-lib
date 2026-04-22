import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = resolve(import.meta.dirname, '../..');

const readWorkspaceFile = (...segments: string[]) =>
  readFileSync(resolve(packageRoot, ...segments), 'utf8');

describe('storybook scaffold verification', () => {
  it('loads the published gantt-lib stylesheet from preview configuration', () => {
    const previewContents = readWorkspaceFile('.storybook', 'preview.ts');

    expect(
      previewContents,
      'Storybook preview must import gantt-lib/styles.css so stories render with the public package CSS contract.',
    ).toMatch(/import\s+['"]gantt-lib\/styles\.css['"];/);
  });

  it('renders the scaffold story through the public package surface only', () => {
    const storyContents = readWorkspaceFile('src', 'stories', 'Scaffold.stories.tsx');
    const scaffoldContents = readWorkspaceFile(
      'src',
      'stories',
      'StorybookScaffold.tsx',
    );

    expect(
      storyContents,
      'Scaffold story should import library symbols from the public gantt-lib package entrypoint.',
    ).toMatch(/from\s+['"]gantt-lib['"]/);

    expect(
      scaffoldContents,
      'Scaffold component should render GanttChart via the public gantt-lib package entrypoint.',
    ).toMatch(/from\s+['"]gantt-lib['"]/);

    for (const [label, contents] of [
      ['story file', storyContents],
      ['scaffold component', scaffoldContents],
    ] as const) {
      expect(contents, `${label} must not reach into gantt-lib internal source files.`).not.toMatch(
        /from\s+['"].*gantt-lib\/src\//,
      );
      expect(contents, `${label} must not import from the website workspace.`).not.toMatch(
        /packages[\\/]website|from\s+['"]\.\.\/\.\.\/website/,
      );
      expect(contents, `${label} must not rely on app-only @/ aliases.`).not.toMatch(
        /from\s+['"]@\//,
      );
    }
  });

  it('exposes a built static Storybook artifact at the Turbo output path', () => {
    const artifactPath = resolve(packageRoot, 'storybook-static', 'index.html');

    expect(
      existsSync(artifactPath),
      `Expected Storybook static artifact at ${artifactPath}. Run \`npm run build -- --filter=storybook\` before this test.`,
    ).toBe(true);

    const indexHtml = readFileSync(artifactPath, 'utf8');

    expect(indexHtml, 'Static Storybook index.html should include a document title.').toMatch(
      /<title>.*<\/title>/i,
    );
    expect(indexHtml, 'Static Storybook index.html should bootstrap the built Storybook shell.').toMatch(
      /<div id="root"><\/div>|id="root"|id="storybook-root"/i,
    );
  });
});
