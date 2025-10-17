const webpack = require('webpack');

const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');
const { experiments } = require('./webpack.main.config');

rules.push(
  {
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
  },
  { test: /\.afm$/, type: 'asset/source' },
  {
    test: /src[/\\]static-assets/,
    type: 'asset/inline',
    generator: {
      dataUrl: content => {
        return content.toString('base64');
      }
    }
  },
  {
    test: /src[/\\]lazy-assets/,
    type: 'asset/resource'
  },
  {
    //enforce: 'post',
    test: /unicode-properties[/\\]index.js$/,
    loader: 'transform-loader',
    options: {
      brfs: {}
    }
  },
  {
    //enforce: 'post',
    test: /fontkit[/\\]index.js$/,
    loader: 'transform-loader',
    options: {
      brfs: {}
    }
  },
  {
    //enforce: 'post',
    test: /linebreak[/\\]src[/\\]linebreaker.js/,
    loader: 'transform-loader',
    options: {
      brfs: {}
    }
  });

module.exports = {
  module: {
    rules,
  },
  plugins: plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    alias: {
      fs: 'pdfkit/js/virtual-fs.js'
    },
    conditionNames: ['require', 'node', 'default']
  },
  externals: {
    'sharp': 'commonjs sharp'
  },
  experiments: {
    topLevelAwait: true
  }
};
