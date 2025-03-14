module.exports = {
  presets: [
    '@babel/preset-env',
    ["@babel/preset-react", {
      "runtime": "automatic"
    }],
    '@babel/preset-typescript',
  ],
  plugins: [
    'babel-plugin-react-require',
    ['@babel/plugin-proposal-decorators', { legacy: true }],
  ],
};
