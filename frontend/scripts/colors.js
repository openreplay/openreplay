const fs = require('fs');

const COLORS_FILE = 'app/styles/import/colors.css';

const colors = fs.readFileSync(COLORS_FILE, 'utf8')
  .split('\n')
  .filter(s => s[0] === '$')
  .map(s => s.split(':')[0].substr(1));


fs.writeFileSync('app/styles/colors-autogen.css', `/* Auto-generated, DO NOT EDIT */
@import 'colors.css';

/* fill */
${ colors.map(color => `.fill-${ color } { fill: $${ color } }`).join('\n') }

/* color */
${ colors.map(color => `.color-${ color } { color: $${ color } }`).join('\n') }

/* color */
${ colors.map(color => `.hover-${ color }:hover { color: $${ color } }`).join('\n') }

/* bg */
${ colors.map(color => `.bg-${ color } { background-color: $${ color } }`).join('\n') }
`)

