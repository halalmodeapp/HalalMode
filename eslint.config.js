const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  // site/ is the static halalmo.de website (its own package, plain browser
  // scripts and an esbuild bundle), not app code.
  { ignores: ['dist/**', '.expo/**', '.test-build/**', 'supabase/functions/**', 'site/**'] },
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
