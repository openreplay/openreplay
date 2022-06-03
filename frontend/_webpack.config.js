const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// const CircularDependencyPlugin = require('circular-dependency-plugin')
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const MomentLocalesPlugin = require('moment-locales-webpack-plugin'); //TODO: replace Moment with date-fns ??
const path = require('path');
const fs = require('fs');
const alias = require('./path-alias');
const environments = require('./env');


const DIST_DIR = 'public';

const GLOBAL_STYLES_DIR = 'app/styles';

const cssEntrypoints = [ 
	'codemirror/lib/codemirror.css',
	'codemirror/theme/yeti.css',
	'codemirror/addon/lint/lint.css',
	'react-daterange-picker/dist/css/react-calendar.css',
	'react-datepicker/dist/react-datepicker.css',
  'rc-time-picker/assets/index.css',
];

const babelLoader = {
  loader: 'babel-loader',
  options: {
    presets: [ 
      [ '@babel/preset-env', {  // probably, use dynamic imports for polifills in future
        "targets": "> 4%, not dead", 
        useBuiltIns: 'entry',
        corejs: 3
      }], 
      '@babel/preset-react',
      "@babel/preset-flow", //TODO: remove, use ts 
    ],
    plugins: [ 
      "@babel/plugin-syntax-bigint",
      ["@babel/plugin-proposal-private-property-in-object", { "loose": true }],
      [ '@babel/plugin-proposal-decorators', { legacy: true } ],
      [ '@babel/plugin-proposal-class-properties', { loose: true }],
      [ '@babel/plugin-proposal-private-methods', { loose: true }],
      // 'recharts'
    ]
  }
};

const cssFiles = fs.readdirSync(GLOBAL_STYLES_DIR, { withFileTypes: true });
cssFiles.forEach(file => {
  if (/.css$/.test(file.name)) {
  	const pathFullName = path.join(__dirname, GLOBAL_STYLES_DIR, file.name);
  	cssEntrypoints.push(pathFullName);
  }
});


function prepareEnv(env) {
  const pEnv = {};
  Object.keys(env).forEach(key => {
    pEnv[ `window.ENV.${ key }` ] = typeof env[ key ] === 'function' ? env[ key ]() : JSON.stringify(env[ key ]);
  });
  return pEnv;
}

module.exports = (envName = 'local') => {
  const env = environments[ envName ];
  const cssFileLoader = {
    loader: MiniCssExtractPlugin.loader,
    options: {
      hmr: !env.PRODUCTION,
    },
  }
  return {
  	// Polyfill only for async (TODO)
    entry: [ './app/initialize.js' ].concat(cssEntrypoints),
    output: {
      path: path.join(__dirname, DIST_DIR),
      filename: 'app-[contenthash:7].js',
      publicPath: '/',
    },
    plugins: [
    	new webpack.ProvidePlugin({
        'React': 'react'   // back code compatability
      }),
      new MiniCssExtractPlugin({
        path: path.join(__dirname, DIST_DIR),
        filename: 'app-[contenthash:7].css'
      }),
      new CopyWebpackPlugin([ 'app/assets' ]),
      new HtmlWebpackPlugin({
      	template: 'app/assets/index.html'
      }),
      new MomentLocalesPlugin(),
      new webpack.DefinePlugin(prepareEnv(env)),
      // new BundleAnalyzerPlugin({ analyzerMode: 'static'}),
      // new CircularDependencyPlugin({
      //   // exclude detection of files based on a RegExp
      //   exclude: /node_modules/,
      //   // add errors to webpack instead of warnings
      //   failOnError: true,
      //   // allow import cycles that include an asyncronous import,
      //   // e.g. via import(/* webpackMode: "weak" */ './file.js')
      //   allowAsyncCycles: false,
      //   // set the current working directory for displaying module paths
      //   cwd: process.cwd(),
      // })
    ],
    module: {
      rules: [

        // global and module css separation. TODO more beautyfull
        {
          test: /\.css$/,
          include: [ path.join(__dirname, "app/components"), path.join(__dirname, "app/player") ],
          use: [
            cssFileLoader,
            {
            	loader: 'css-loader',
  					  options: {
  					    importLoaders: 1,
  					    modules: {
                  localIdentName: '[name]_[local]_[hash:base64:7]'
                },
  					  }
  					},
            'postcss-loader'
          ]
        },
        {
          test: /\.css$/,
          include: [ path.join(__dirname, "node_modules"), path.join(__dirname, "app/styles") ],
          use: [
            cssFileLoader,
            {
            	loader: 'css-loader',
  					  options: {
  					    importLoaders: 1,
  					  }
  					},
            'postcss-loader'
          ]
        },

        {
          test: /\.svg$/,
          use: ['@svgr/webpack'],
        },
        {
  	      test: /\.js$/,
  	      include: [ path.join(__dirname, "app"), path.join(__dirname, ".storybook") ],
  	      use: babelLoader,
  	    },
        {
          test: /\.tsx?$/,
          include: path.join(__dirname, "app"),
          use: [ 'ts-loader' ]
        },
      ]
    },
    resolve: { 
      alias,
      extensions: ['.js', '.json', '.ts', '.tsx' ],
    },
    mode: env.PRODUCTION ? 'production' : 'development',
    optimization: {
      splitChunks: {
        chunks: 'all',
      },
    },
    devServer: {
      contentBase: path.join(__dirname, DIST_DIR),
      //compress: true,
      port: 3333,
      historyApiFallback: true,
    },
    stats: 'errors-only',
    devtool: env.SOURCEMAP && 'source-map'
  };
}
