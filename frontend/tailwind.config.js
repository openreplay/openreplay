const colors = require('./app/theme/colors');
const defaultColors = require('tailwindcss/colors');

const deprecatedDefaults = ['lightBlue', 'warmGray', 'trueGray', 'coolGray', 'blueGray']
deprecatedDefaults.forEach(color => {
  delete defaultColors[color]
})

module.exports = {
  mode: 'jit',
  content: ['./app/**/*.tsx', './app/**/*.js'],
  theme: {
    colors: {
      ...defaultColors,
      ...colors,
    },
    extend: {
      keyframes: {
        'fade-in': {
          '0%': {
            opacity: '0',
            // transform: 'translateY(-10px)'
          },
          '100%': {
            opacity: '1',
            // transform: 'translateY(0)'
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
        'disabled-text': 'rgba(0,0,0, 0.38)',
      },
      boxShadow: {
        'border-blue': `0 0 0 1px ${colors['active-blue-border']}`,
        'border-main': `0 0 0 1px ${colors['main']}`,
        'border-gray': '0 0 0 1px #999',
      },
      button: {
        'background-color': 'red',
      },
    },
  },
  variants: {
    visibility: ['responsive', 'hover', 'focus', 'group-hover'],
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
