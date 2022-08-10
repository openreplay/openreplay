const path = require('path');
const colors = require('./app/theme/colors');
const cssnanoOptions = { zindex: false };

module.exports = ({ file, options, env }) => ({
  // parser: 'sugarss',  // syntax check ? 
  plugins: {
    'postcss-import': {
      path: path.join(__dirname, 'app/styles/import')
    },
    'postcss-mixins': {},
    'postcss-simple-vars': { variables: colors },
    'postcss-nesting': {},
    // 'postcss-inline-svg': {
    //   path: path.join(__dirname, 'app/svg'),
    // },
    'tailwindcss/nesting': {},
    tailwindcss: {},
    autoprefixer: {},
    //'postcss-preset-env': {}, //includes autoprefixer
    cssnano: env === 'production' ? cssnanoOptions : false,
  }
});