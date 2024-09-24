const path = require('path');

module.exports = {
    '@': path.resolve(__dirname, 'app'),
    App: path.resolve(__dirname, 'app'),
    'App/*': path.resolve(__dirname, 'app/*'),
    SVG: path.resolve(__dirname, 'app/svg'),
    'SVG/*': path.resolve(__dirname, 'app/svg/*'),
    Components: path.resolve(__dirname, 'app/components'),
    'Components/*': path.resolve(__dirname, 'app/components/*'),
    Types: path.resolve(__dirname, 'app/types'),
    'Types/*': path.resolve(__dirname, 'app/types/*'),
    UI: path.resolve(__dirname, 'app/components/ui'),
    'UI/*': path.resolve(__dirname, 'app/components/ui/*'),
    HOCs: path.resolve(__dirname, 'app/components/hocs'),
    'HOCs/*': path.resolve(__dirname, 'app/components/hocs/*'),
    Shared: path.resolve(__dirname, 'app/components/shared'),
    'Shared/*': path.resolve(__dirname, 'app/components/shared/*'),
    Player: path.resolve(__dirname, 'app/player'),
    'Player/*': path.resolve(__dirname, 'app/player/*'),
};
