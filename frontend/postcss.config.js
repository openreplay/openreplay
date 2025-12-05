const path = require('path');
const colors = require('./app/theme/colors');

const transformColorsToCssVars = (colorsObj) => {
  const result = {};

  for (const [key, value] of Object.entries(colorsObj)) {
    if (typeof value === 'object' && value !== null && key !== 'dark') {
      // Handle nested objects
      const transformedNested = {};
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        // Create CSS variable reference for nested values
        transformedNested[nestedKey] = `var(--color-${key}-${nestedKey})`;
      }
      result[key] = transformedNested;
    } else if (key !== 'dark') {
      // Create CSS variable reference for direct values
      result[key] = `var(--color-${key})`;
    }
  }

  return result;
};

const cssVarColors = transformColorsToCssVars(colors);

module.exports = ({
  // parser: 'sugarss',  // syntax check ?
  plugins: {
    'postcss-import': {
      path: path.join(__dirname, 'app/styles/import')
    },
    'postcss-mixins': {},
    'postcss-simple-vars': {
      variables: cssVarColors
    },
    'postcss-nesting': {},
    // 'postcss-inline-svg': {
    //   path: path.join(__dirname, 'app/svg'),
    // },
    'tailwindcss/nesting': {},
    tailwindcss: {},
    //'postcss-preset-env': {}, //includes autoprefixer
    cssnano: false,
  }
});
