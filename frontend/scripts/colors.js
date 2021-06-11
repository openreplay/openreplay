const fs = require('fs');


const colors = Object.keys(require('../app/theme/colors.js'));


fs.writeFileSync('app/styles/colors-autogen.css', `/* Auto-generated, DO NOT EDIT */

/* fill */
${ colors.map(color => `.fill-${ color } { fill: $${ color } }`).join('\n') }

/* color */
${ colors.map(color => `.color-${ color } { color: $${ color } }`).join('\n') }

/* color */
${ colors.map(color => `.hover-${ color }:hover { color: $${ color } }`).join('\n') }
`)

