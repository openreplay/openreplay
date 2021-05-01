const pathAlias = require('../path-alias');
const mainConfig = require('../webpack.config.js');

module.exports = async ({ config }) => {
  var conf = mainConfig();
  config.resolve.alias = Object.assign(pathAlias, config.resolve.alias); // Path Alias
  config.module.rules = conf.module.rules;
  config.module.rules[0].use[0] = 'style-loader';  // instead of separated css
  config.module.rules[1].use[0] = 'style-loader';
  config.plugins.push(conf.plugins[0]);   // global React
  config.plugins.push(conf.plugins[5]);
  config.entry = config.entry.concat(conf.entry.slice(2)) // CSS entries
  return config;
};
