const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
  module: {
    rules,
  },
  plugins: plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    alias: {
			fs: 'pdfkit/js/virtual-fs.js' // hot reload fix, src: https://github.com/blikblum/pdfkit-webpack-example/blob/master/webpack.config.js
		}
  },
};
