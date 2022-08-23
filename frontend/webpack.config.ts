import webpack from "webpack";
import path from "path";
import { Configuration as WebpackConfiguration, HotModuleReplacementPlugin } from "webpack";
import { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CompressionPlugin from "compression-webpack-plugin";
const dotenv = require('dotenv').config({ path: __dirname + '/.env' })
const isDevelopment = process.env.NODE_ENV !== 'production'
const stylesHandler = MiniCssExtractPlugin.loader;
const ENV_VARIABLES = JSON.stringify(dotenv.parsed);
import pathAlias from './path-alias';

interface Configuration extends WebpackConfiguration {
  devServer?: WebpackDevServerConfiguration
}

const config: Configuration = {
  // mode: isDevelopment ? "development" : "production",
  output: {
    publicPath: "/",
    filename: 'app-[contenthash:7].js',
    path: path.resolve(__dirname, 'public'),
  },
  entry: "./app/initialize.js",
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
  module: {
    exprContextCritical: false,
    rules: [
      {
        test: /\.(ts|js)x?$/i,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              "@babel/preset-react",
              "@babel/preset-typescript",
            ],
          },
        },
      },
      {
        test: /\.s[ac]ss$/i,
        exclude: /node_modules/,
        use: [stylesHandler, 'css-loader', 'postcss-loader', 'sass-loader'],
      },
      {
        test: /\.css$/i,
        exclude: /node_modules/,
        use: [
          stylesHandler,
          {
            loader: "css-loader",
            options: {
              modules: {
                mode: "local",
                auto: true,
                localIdentName: "[name]__[local]--[hash:base64:5]",
              }
              // url: {
              //     filter: (url: string) => {
              //       // Semantic-UI-CSS has an extra semi colon in one of the URL due to which CSS loader along
              //       // with webpack 5 fails to generate a build.
              //       // Below if condition is a hack. After Semantic-UI-CSS fixes this, one can replace use clause with just
              //       // use: ['style-loader', 'css-loader']
              //       if (url.includes('charset=utf-8;;')) {
              //         return false;
              //       }
              //       return true;
              //     },
              // }
            },
          },
          'postcss-loader'
        ],
      },
      // {
      //   test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
      //   exclude: /node_modules/,
      //   type: 'asset',
      // },
      // {
      //   test: /\.svg/,
      //   use: ["@svgr/webpack"],
      // },
      {
        test: /\.(svg)$/i,
        exclude: /node_modules/,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: pathAlias,
    fallback: {
      assert: false,
    },
  },
  plugins: [
    new CompressionPlugin(),
    new webpack.DefinePlugin({
      // 'process.env': ENV_VARIABLES,
      'window.env': ENV_VARIABLES,
      'window.env.PRODUCTION': isDevelopment ? false : true,
    }),
    new HtmlWebpackPlugin({
      template: 'app/assets/index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "./app/assets", to: "assets" },
      ],
    }),
    new MiniCssExtractPlugin(),
  ],
  devtool: isDevelopment ? "inline-source-map" : false,
  performance: {
    hints: false,
  },
  devServer: {
    // static: path.join(__dirname, "public"),
    historyApiFallback: true,
    host: 'localhost',
    open: true,
    port: 3333,
    hot: true,
  },
};

export default config;
