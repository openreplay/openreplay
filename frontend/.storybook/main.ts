import custom from '../webpack.config';

export default {
  stories: ['../app/components/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: '@storybook/react',
  core: {
    builder: '@storybook/builder-webpack5',
  },
  reactOptions: {
    fastRefresh: true,
  },
  webpackFinal: async (config: any) => {
    config.module = custom.module;
    config.resolve = custom.resolve;
    if (custom.plugins) {
      config.plugins.unshift(custom.plugins[0]);
      config.plugins.unshift(custom.plugins[1]);
      config.plugins.unshift(custom.plugins[4]);
    }
    config.module.rules.unshift({
      test: /\.(svg)$/i,
      exclude: /node_modules/,
      use: [
        {
          loader: 'file-loader',
        },
      ],
    });
    return config;
  },
};
