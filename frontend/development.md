### Prerequisites

- [Vagrant](../scripts/vagrant/README.md)
- Node Version 17
- npm

### Development environment

```bash
cd openreplay/frontend
# Change endpoints to local openreplay installation
sed -i 's#PRODUCTION: true#PRODUCTION: false#g' env.js
sed -i "s#API_EDP: .*#API_EDP: 'http://openreplay.local/api',#g" env.js
sed -i "s#ASSETS_HOST: .*#ASSETS_HOST: 'http://openreplay.local/assets',#g" env.js

# Installing dependencies
npm install

# Generating assets
npm run gen:css-types
npm run gen:icons
npm run gen:colors
```
