import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  async viteFinal(config) {
    const { default: tailwind } = await import('@tailwindcss/vite');
    config.plugins = [...(config.plugins ?? []), tailwind()];
    return config;
  },
};

export default config;
