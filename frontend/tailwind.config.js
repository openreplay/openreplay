const colors = require('./app/theme/colors');
const defaultColors = require('tailwindcss/colors');
const plugin = require('tailwindcss/plugin');

const deprecatedDefaults = [
  'lightBlue',
  'warmGray',
  'trueGray',
  'coolGray',
  'blueGray',
];
deprecatedDefaults.forEach((color) => {
  delete defaultColors[color];
});

const cssVar = (name) => `var(--${name})`;

function createColorVariables(colors, darkColors) {
  const result = {};

  // Process all colors
  Object.entries(colors).forEach(([key, value]) => {
    // Skip nested objects for now (we'll handle them separately)
    if (typeof value !== 'object' || value === null) {
      result[key] = cssVar(`color-${key}`);
    }
  });

  // Handle nested color objects
  Object.entries(colors).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null && key !== 'dark') {
      result[key] = {};
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        result[key][nestedKey] = cssVar(`color-${key}-${nestedKey}`);
      });
    }
  });

  return result;
}

const variableBasedColors = createColorVariables(colors);

module.exports = {
  important: '#app',
  mode: 'jit',
  darkMode: 'class',
  content: ['./app/**/*.tsx', './app/**/*.js'],
  theme: {
    // Use variable references instead of hard-coded colors
    colors: {
      ...defaultColors,
      ...variableBasedColors,
    },
    extend: {
      keyframes: {
        'fade-in': {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
        'bg-spin': {
          '0%': {
            backgroundPosition: '0 50%',
          },
          '50%': {
            backgroundPosition: '100% 50%',
          },
          '100%': {
            backgroundPosition: '0 50%',
          },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'bg-spin': 'bg-spin 1s ease infinite',
      },
      colors: {
        'disabled-text': cssVar('color-disabled-text'),
      },
      boxShadow: {
        'border-blue': `0 0 0 1px ${cssVar('color-active-blue-border')}`,
        'border-main': `0 0 0 1px ${cssVar('color-main')}`,
        'border-gray': `0 0 0 1px ${cssVar('color-gray-border')}`,
      },
      button: {
        'background-color': 'red',
      },
    },
  },
  variants: {
    visibility: ['responsive', 'hover', 'focus', 'group-hover'],
  },
  plugins: [
    plugin(function ({ addBase }) {
      const lightModeVars = {};

      Object.entries(colors).forEach(([key, value]) => {
        if (typeof value !== 'object' || value === null || key === 'dark') {
          lightModeVars[`--color-${key}`] = value;
        }
      });
      Object.entries(colors).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null && key !== 'dark') {
          Object.entries(value).forEach(([nestedKey, nestedValue]) => {
            lightModeVars[`--color-${key}-${nestedKey}`] = nestedValue;
          });
        }
      });

      const darkModeVars = {};

      if (colors.dark) {
        // Process flat dark colors
        Object.entries(colors.dark).forEach(([key, value]) => {
          if (typeof value !== 'object') {
            // Find the corresponding light mode key
            const lightKey = key.replace('dark-', '');
            darkModeVars[`--color-${lightKey}`] = value;
          }
        });

        Object.entries(colors.dark).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            Object.entries(value).forEach(([nestedKey, nestedValue]) => {
              darkModeVars[`--color-${key}-${nestedKey}`] = nestedValue;
            });
          }
        });

        if (colors['gray-light'] && colors.dark['gray-light']) {
          darkModeVars['--color-gray-light'] = colors.dark['gray-light'];
        }
        if (colors['gray-dark'] && colors.dark['gray-dark']) {
          darkModeVars['--color-gray-dark'] = colors.dark['gray-dark'];
        }
        darkModeVars['--color-disabled-text'] =
          colors.dark['text-disabled'] || 'rgba(255, 255, 255, 0.38)';
      }

      addBase({
        ':root': lightModeVars,
        '.dark': darkModeVars,
      });
    }),
  ],
  corePlugins: {
    preflight: false,
  },
};
