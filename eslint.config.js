const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: [
      '**/node_modules/**',
      '**/.expo/**',
      '**/.test-build/**',
      '**/.count-build/**',
      '**/dist/**',
      '**/tmp/**',
      '**/output/**',
      '.claude/**',
      'site/logo-effect.js',
      // This old staging-only helper is not loaded by any shipped route.
      'site/stage.js',
      'supabase/functions/**',
    ],
  },
  expoConfig,
  {
    rules: {
      // Reanimated shared values are intentionally mutated inside worklets.
      // These React Compiler rules do not understand that execution model.
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
    },
  },
]);
