const fs = require('fs');
const colors = require('../app/theme/colors.js');

// Helper function to flatten the nested color objects
const flattenColors = (colors) => {
  let flatColors = {};

  for (const [key, value] of Object.entries(colors)) {
    if (typeof value === 'object') {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        flatColors[`${key}-${nestedKey}`] = nestedValue;
      }
    } else {
      flatColors[key] = value;
    }
  }

  return flatColors;
};

const flatColors = flattenColors(colors);

const generatedCSS = `/* Auto-generated, DO NOT EDIT */

/* fill */
${ Object.entries(flatColors).map(([name, value]) => `.fill-${ name.replace(/ /g, '-') } { fill: ${ value } }`).join('\n') }
${ Object.entries(flatColors).map(([name, value]) => `.hover-fill-${ name.replace(/ /g, '-') }:hover svg { fill: ${ value } }`).join('\n') }

/* color */
${ Object.entries(flatColors).map(([name, value]) => `.color-${ name.replace(/ /g, '-') } { color: ${ value } }`).join('\n') }

/* hover color */
${ Object.entries(flatColors).map(([name, value]) => `.hover-${ name.replace(/ /g, '-') }:hover { color: ${ value } }`).join('\n') }

${ Object.entries(flatColors).map(([name, value]) => `.border-${ name.replace(/ /g, '-') } { border-color: ${ value } }`).join('\n') }
`;

// Log the generated CSS to the console
console.log(generatedCSS);

// Write the generated CSS to a file
fs.writeFileSync('app/styles/colors-autogen.css', generatedCSS);
