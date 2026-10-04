// Expo's defaults, plus one exclusion.
//
// `npm run deploy:web` has Wrangler create and delete temporary folders under
// .wrangler/ inside the project. The dev server watches the whole project, so
// it tried to watch a folder that was already gone and crashed (ENOENT), which
// is why the local preview kept dying after every deploy.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  /[\\/]\.wrangler[\\/].*/,
];

module.exports = config;
