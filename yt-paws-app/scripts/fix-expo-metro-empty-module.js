const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const target = path.join(
  projectRoot,
  'node_modules',
  '@expo',
  'metro',
  'node_modules',
  'metro-runtime',
  'src',
  'modules',
  'empty-module.js'
);

const source = path.join(
  projectRoot,
  'node_modules',
  'metro-runtime',
  'src',
  'modules',
  'empty-module.js'
);

if (!fs.existsSync(source)) {
  process.exit(0);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
