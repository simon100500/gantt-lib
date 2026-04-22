import type { Preview } from '@storybook/react';
import 'gantt-lib/styles.css';
import '../src/preview.css';
// Keep this preview order aligned with capabilitySections in ../src/stories/capabilities/catalog,
// exampleSections in ../src/stories/examples/catalog, and heavyDataSections in
// ../src/stories/heavy-data/catalog.

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          'Overview',
          '*',
          ['Scaffold', 'Workspace Smoke Test'],
          'Capabilities',
          [
            'Layout',
            'Task states',
            'Interaction',
            'Dependencies',
            'Filtering',
            'Extensions',
            'Imperative controls',
          ],
          'Examples',
          [
            'Management overview',
            'Searchable triage',
            'Extension workspace',
            'Operations review',
          ],
          'Heavy data',
          ['~100 rows', '~500 rows', '~1000 rows'],
        ],
      },
    },
  },
};

export default preview;
