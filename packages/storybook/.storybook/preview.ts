import type { Preview } from '@storybook/react';
import 'gantt-lib/styles.css';
import '../src/preview.css';
// Keep this preview order aligned with capabilitySections in ../src/stories/capabilities/catalog
// and exampleSections in ../src/stories/examples/catalog.

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
            'Program workspace',
            'Search and highlight',
            'Dependency control center',
          ],
        ],
      },
    },
  },
};

export default preview;
