const colors = require('./app/theme/colors');
const defaultColors = require('tailwindcss/colors');

module.exports = {
  content: [
    './app/**/*.tsx',
    './app/**/*.js'
  ],
  theme: {
    colors: {
      ...defaultColors,
      ...colors
    },
    extend: {
      keyframes: {
        'fade-in': {
          '0%': {
            opacity: '0'
            // transform: 'translateY(-10px)'
          },
          '100%': {
            opacity: '1'
            // transform: 'translateY(0)'
          }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out'
      },
      colors: {
        'disabled-text': 'rgba(0,0,0, 0.38)'
      },
      boxShadow: {
        'border-blue': `0 0 0 1px ${colors['active-blue-border']}`,
        'border-main': `0 0 0 1px ${colors['main']}`,
        'border-gray': '0 0 0 1px #999'
      },
      button: {
        'background-color': 'red'
      }
    }
  },
  variants: {
    visibility: ['responsive', 'hover', 'focus', 'group-hover']
  },
  plugins: [],
  corePlugins: {
    preflight: false
  }
};
