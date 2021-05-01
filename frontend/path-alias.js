const path = require('path');

module.exports = {
  App: path.resolve(__dirname, './app'),
  Duck: path.resolve(__dirname, './app/duck'),
  Components: path.resolve(__dirname, './app/components'),
  Shared: path.resolve(__dirname, './app/components/shared'),
  UI: path.resolve(__dirname, './app/components/ui'),
  HOCs: path.resolve(__dirname, './app/components/hocs'),
  Types: path.resolve(__dirname, './app/types'),
  Player: path.resolve(__dirname, './app/player'),
  Issues: path.resolve(__dirname, './app/components/Session/Issues'),
};