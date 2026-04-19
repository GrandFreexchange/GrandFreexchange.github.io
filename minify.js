const fs = require('fs');
const minify = require('html-minifier').minify;
const JavaScriptObfuscator = require('javascript-obfuscator');

const html = fs.readFileSync('dev.html', 'utf8');

const minified = minify(html, {
  minifyJS: function(text) {
      try {
          return JavaScriptObfuscator.obfuscate(text, {
              compact: true,
              controlFlowFlattening: true,
              controlFlowFlatteningThreshold: 1,
              numbersToExpressions: true,
              simplify: true,
              stringArrayShuffle: true,
              splitStrings: true,
              stringArrayThreshold: 1
          }).getObfuscatedCode();
      } catch (e) {
          console.error("Obfuscation error:", e);
          return text;
      }
  },
  minifyCSS: true,
  minifyURLs: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  collapseWhitespace: true,
  conservativeCollapse: true
});

fs.writeFileSync('index.html', minified);
console.log('✓ Minified dev.html → index.html');
console.log(`Original: ${html.length} bytes`);
console.log(`Minified: ${minified.length} bytes`);
console.log(`Reduction: ${((1 - minified.length / html.length) * 100).toFixed(1)}%`);
