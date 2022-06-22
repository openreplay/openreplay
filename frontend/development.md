### Prerequisites

- [Vagrant](../scripts/vagrant/README.md)
- Node Version 17
- yarn

### Development environment

```bash
cd openreplay/frontend
# Change endpoints to local openreplay installation
sed -i 's#PRODUCTION: true#PRODUCTION: false#g' env.js
sed -i "s#API_EDP: .*#API_EDP: 'http://openreplay.local/api',#g" env.js
sed -i "s#ASSETS_HOST: .*#ASSETS_HOST: 'http://openreplay.local/assets',#g" env.js

# Installing dependencies
yarn
```
