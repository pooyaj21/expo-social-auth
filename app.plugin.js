const { createRunOncePlugin, withPlugins } = require("expo/config-plugins");
const pkg = require("./package.json");

// Plugin packages export via `exports.default` when built from TS.
function resolvePlugin(mod) {
  return mod.default ?? mod;
}

/**
 * Config plugin for expo-social-auth.
 *
 * ```js
 * plugins: [
 *   [
 *     "expo-social-auth",
 *     {
 *       google: { iosUrlScheme: "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID" },
 *       apple: true,
 *     },
 *   ],
 * ]
 * ```
 *
 * Options:
 * - `google`:
 *   - `{ iosUrlScheme }` — standalone setup: adds the Google redirect URL scheme to Info.plist.
 *   - `{ firebase: true }` — Firebase setup: wires up `googleServicesFile` for both platforms
 *     (skip if `@react-native-firebase/app` already does this).
 *   - `true` — no native config changes (bare projects / already configured).
 *   - `false` (default) — skip Google entirely.
 * - `apple`:
 *   - `true` — enables the Sign In with Apple capability/entitlement.
 *   - `false` (default) — skip Apple entirely.
 */
const withSocialAuth = (config, props = {}) => {
  const google = props.google ?? false;
  const apple = props.apple ?? false;
  const plugins = [];

  if (google) {
    const googlePlugin = resolvePlugin(
      require("@react-native-google-signin/google-signin/app.plugin.js"),
    );
    const iosUrlScheme =
      typeof google === "object" ? google.iosUrlScheme : undefined;
    const firebase = typeof google === "object" ? google.firebase : false;

    if (iosUrlScheme) {
      plugins.push([googlePlugin, { iosUrlScheme }]);
    } else if (firebase) {
      plugins.push(googlePlugin);
    }
  }

  if (apple) {
    const applePlugin = resolvePlugin(
      require("expo-apple-authentication/app.plugin.js"),
    );
    plugins.push(applePlugin);
    config.ios = { ...config.ios, usesAppleSignIn: true };
  }

  return withPlugins(config, plugins);
};

module.exports = createRunOncePlugin(withSocialAuth, pkg.name, pkg.version);
