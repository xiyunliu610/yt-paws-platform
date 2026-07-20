const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.emptyModulePath = require.resolve(
  'metro-runtime/src/modules/empty-module.js'
);

const originalGetPolyfills = config.serializer.getPolyfills;
config.serializer.getPolyfills = (ctx) => [
  path.resolve(__dirname, 'src/polyfills/metroRequireShim.js'),
  ...(originalGetPolyfills ? originalGetPolyfills(ctx) : []),
];

module.exports = config;
