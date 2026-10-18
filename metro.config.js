// Expo's defaults, plus exclusions for folders the app never imports.
//
// `npm run deploy:web` has Wrangler create and delete temporary folders under
// .wrangler/ inside the project. The dev server watches the whole project, so
// it tried to watch a folder that was already gone and crashed (ENOENT), which
// is why the local preview kept dying after every deploy.
//
// Build output (dist/ holds the APKs, over a gigabyte), the website's own
// node_modules and scratch folders are left out for the same reason: watching
// them ran Windows out of file handles (EMFILE), and the dev server stopped
// serving pages. The app still imports images from site/img, so only
// site/node_modules is excluded there.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const inProject = (...parts) =>
  new RegExp(`^${path.join(__dirname, ...parts).replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&')}[\\\\/].*`);

const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  /[\\/]\.wrangler[\\/].*/,
  inProject('dist'),
  inProject('output'),
  inProject('tmp'),
  inProject('web-build'),
  inProject('site', 'node_modules'),
  inProject('Halal Mode LLC EIN Packet'),
];

module.exports = config;
