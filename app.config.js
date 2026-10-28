const resolveConfig = ({ config }) => {
  const buildArchs = (process.env.EXPO_ANDROID_BUILD_ARCHS || "")
    .split(",")
    .map((arch) => arch.trim())
    .filter(Boolean);

  // EAS sets the update channel itself. A build made on this machine has no
  // EAS, so LOCAL_UPDATES_CHANNEL tells it which channel to follow.
  const channel = process.env.LOCAL_UPDATES_CHANNEL;

  return {
    ...config,
    ...(channel
      ? { updates: { ...config.updates, requestHeaders: { "expo-channel-name": channel } } }
      : {}),
    plugins: (config.plugins || []).map((plugin) => {
      if (plugin === "expo-build-properties" && buildArchs.length > 0) {
        return ["expo-build-properties", { android: { buildArchs } }];
      }

      return plugin;
    }),
  };
};

module.exports = resolveConfig;
