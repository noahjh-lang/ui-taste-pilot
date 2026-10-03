import type { Decorator, Preview } from '@storybook/react-vite';
import { TooltipProvider } from '../src';
import './preview.css';

/** Toolbar toggle so every component is reviewed in both themes. */
const withTheme: Decorator = (Story, context) => {
  document.documentElement.classList.toggle('dark', context.globals.theme === 'dark');
  return (
    <TooltipProvider>
      <div className="p-4">
        <Story />
      </div>
    </TooltipProvider>
  );
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
};

export default preview;
