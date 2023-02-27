const fs = require('fs');


const colors = Object.keys(require('../app/theme/colors.js'));


fs.writeFileSync('app/styles/colors-autogen.css', `/* Auto-generated, DO NOT EDIT */

/* fill */
${ colors.map(color => `.fill-${ color } { fill: $${ color } }`).join('\n') }
${ colors.map(color => `.hover-fill-${ color }:hover svg { fill: $${ color } }`).join('\n') }

/* color */
${ colors.map(color => `.color-${ color } { color: $${ color } }`).join('\n') }

/* hover color */
${ colors.map(color => `.hover-${ color }:hover { color: $${ color } }`).join('\n') }

${ colors.map(color => `.border-${ color } { border-color: $${ color } }`).join('\n') }
`)

