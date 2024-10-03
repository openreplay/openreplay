module.exports = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
  plugins: [
    'babel-plugin-react-require',
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    [
      'prismjs',
      {
        languages: [
          'javascript',
          'css',
          'bash',
          'typescript',
          'jsx',
          'kotlin',
          'swift',
        ],
        theme: 'default',
        css: true,
      },
    ],
  ],
};
