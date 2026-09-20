// Expo checks Origin against Host, which differ behind the Base44 preview proxy.
// Keep native/production config unchanged; allow the configured web development origin.
module.exports = ({ config }) => {
  const origin = process.env.EXPO_PUBLIC_WEB_APP_URL;
  if (process.env.NODE_ENV === 'production' || !origin) return config;
  return {
    ...config,
    extra: {
      ...config.extra,
      router: { ...config.extra?.router, origin },
    },
  };
};
