const resolveConfig = ({ config }) => {
  const buildArchs = (process.env.EXPO_ANDROID_BUILD_ARCHS || "")
    .split(",")
    .map((arch) => arch.trim())
    .filter(Boolean);

  return {
    ...config,
    plugins: (config.plugins || []).map((plugin) => {
      if (plugin === "expo-build-properties" && buildArchs.length > 0) {
        return ["expo-build-properties", { android: { buildArchs } }];
      }

      return plugin;
    }),
  };
};

module.exports = resolveConfig;
