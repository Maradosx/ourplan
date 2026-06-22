// Dynamic Expo config layer.
//
// Static configuration lives in app.json. This file only injects values that must
// NOT be committed to source control (read from the environment / .env), so secrets
// like the Google Maps API key never end up in git history.
//
// Expo automatically loads `.env` files and exposes them on `process.env` here.
// See apps/mobile/.env.example for the variables this expects.

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...(config.ios && config.ios.config),
        ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
      },
    },
  };
};
