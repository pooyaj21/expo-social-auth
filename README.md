# @pj21/expo-social-auth

Google and Apple sign-in for **Expo / React Native** apps with one unified, fully-typed API.

- ✅ One result shape for every provider — a discriminated union (`success` / `cancelled` / `error`), no try/catch needed
- ✅ Returns the provider `idToken` ready to send to your backend for verification
- ✅ Safe in **Expo Go** — native modules are loaded lazily, so nothing crashes; you get a clean `module_not_available` error instead
- ✅ Single install — the Google and Apple SDKs come bundled and are autolinked automatically

## Installation

```sh
npx expo install @pj21/expo-social-auth
```

That's it — `@react-native-google-signin/google-signin` and `expo-apple-authentication` are installed with it and picked up by Expo autolinking (SDK 52+).

> The providers require native code, so you need a [development build](https://docs.expo.dev/develop/development-builds/introduction/) (`npx expo run:ios` / `run:android`). They do **not** work in Expo Go.
>
> On an older Expo SDK, align the Apple module with your SDK after installing: `npx expo install expo-apple-authentication`.

### Using only one provider

If you only use one provider, set it to `false` in the [config plugin](#config-plugin-managed-workflow) (e.g. `"apple": false`) so no native configuration is generated for it. To additionally keep the unused SDK's native code out of your app binary, use Expo autolinking's official exclude list — add it to your app's **`package.json`** (not `app.json`):

```json
{
  "expo": {
    "autolinking": {
      "exclude": ["expo-apple-authentication"]
    }
  }
}
```

…or to skip Google instead:

```json
{
  "expo": {
    "autolinking": {
      "exclude": ["@react-native-google-signin/google-signin"]
    }
  }
}
```

Then rebuild (`npx expo prebuild --clean` / `npx expo run:ios`). The excluded module's native code is no longer compiled into your app — only its few-KB JS wrapper remains in `node_modules`. Calling the excluded provider at runtime safely returns a `module_not_available` error result instead of crashing.

## Setup

### What's required vs optional

**Google — required:**

| # | Step | Where |
| --- | --- | --- |
| 1 | Create a **Web** OAuth client ID (produces the `idToken`) | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| 2 | Create an **iOS** OAuth client ID | Google Cloud Console |
| 3 | Create an **Android** OAuth client ID with your signing key's **SHA-1** (or register the SHA-1 in Firebase) | Google Cloud Console / Firebase console |
| 4 | Register the iOS redirect URL scheme | Config plugin (`google.iosUrlScheme`) — or automatic with Firebase / manual in bare workflow |
| 5 | Call `configureGoogleSignIn({ webClientId })` at app startup | Your code |

**Google — optional:** `iosClientId` (omit when using Firebase — read from `GoogleService-Info.plist`), `scopes`, `offlineAccess`, `hostedDomain`, `profileImageSize`.

**Apple — required:**

| # | Step | Where |
| --- | --- | --- |
| 1 | Enable the **Sign In with Apple** capability for your app identifier | [Apple Developer portal](https://developer.apple.com/account/resources/identifiers/list) |
| 2 | Add the capability/entitlement to the app | Config plugin (`"apple": true`) — or Xcode in bare workflow |

**Apple — optional:** `requestedScopes` on `signInWithApple()` (defaults to both `fullName` and `email`). No startup configuration is needed.

> Apple's App Store review **requires** offering Sign In with Apple if your iOS app offers any other third-party login (like Google) — plan to ship both on iOS.

How much native setup you need depends on your workflow:

- **Managed workflow / CNG** (no committed `ios/` & `android/` folders — `npx expo prebuild` generates them): use the config plugins below.
- **Bare workflow** (committed `ios/` & `android/` folders): skip the plugin and configure the native projects directly — see [Bare workflow](#bare-workflow).

### Config plugin (managed workflow)

One plugin entry configures everything. Add it to `app.json` / `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "@pj21/expo-social-auth",
        {
          "google": {
            "iosUrlScheme": "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID"
          },
          "apple": true
        }
      ]
    ]
  }
}
```

#### `google` option

| Value | Effect |
| --- | --- |
| `{ "iosUrlScheme": "com.googleusercontent.apps.…" }` | Standalone setup — adds the Google redirect URL scheme to `Info.plist` |
| `{ "firebase": true }` | Firebase setup — wires up your `googleServicesFile` on both platforms (skip if `@react-native-firebase/app` already does this) |
| `true` | No native changes — for projects already configured |
| `false` *(default)* | Skip Google configuration |

#### `apple` option

| Value | Effect |
| --- | --- |
| `true` | Adds the Sign In with Apple capability/entitlement |
| `false` *(default)* | Skip Apple configuration |

Only the providers you explicitly enable get configured — omitting an option means that provider's native setup is skipped. Pick **one** of the `google` object modes: `iosUrlScheme` for standalone setups, `firebase: true` for Firebase setups.

You still need the accounts-side setup from the [checklist above](#whats-required-vs-optional), and to configure Google once at app startup (e.g. in your root layout):

```ts
import { configureGoogleSignIn } from "@pj21/expo-social-auth";

configureGoogleSignIn({
  webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
  iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com", // omit when using Firebase
});
```

### Bare workflow

If your `ios/` and `android/` folders are committed, config plugins don't run — configure the native projects instead:

- **Apple**: in Xcode, add the **Sign In with Apple** capability to your target (adds `com.apple.developer.applesignin` to your `.entitlements` file).
- **Google (iOS)**: add your reversed iOS client ID (`com.googleusercontent.apps.YOUR_IOS_CLIENT_ID`) as a URL scheme in `Info.plist` under `CFBundleURLTypes`. If you use Firebase, this is the `REVERSED_CLIENT_ID` from `GoogleService-Info.plist`, and the SDK picks up the client ID from that file automatically.
- **Google (Android)**: no native changes needed — just make sure your signing key's SHA-1 fingerprint is registered (in the Firebase console or in the Android OAuth client in Google Cloud Console).

Either way, you still call `configureGoogleSignIn({ webClientId })` at startup — the **web client ID** is what makes Google return an `idToken` you can verify on your backend.

## Usage

### With the hook

```tsx
import { useSocialAuth } from "@pj21/expo-social-auth";

function LoginButtons() {
  const { signIn, loading, activeProvider } = useSocialAuth();

  const handle = async (provider: "google" | "apple") => {
    const result = await signIn(provider);

    switch (result.type) {
      case "success":
        // Verify this JWT on your backend
        await api.loginSocial({ token: result.idToken, platform: provider });
        break;
      case "cancelled":
        break; // user backed out — usually nothing to do
      case "error":
        console.warn(result.code, result.message);
        break;
    }
  };

  return (
    <>
      <Button
        title="Continue with Google"
        disabled={loading}
        onPress={() => handle("google")}
      />
      <Button
        title="Continue with Apple"
        disabled={loading}
        onPress={() => handle("apple")}
      />
    </>
  );
}
```

### Without the hook

Every function also works standalone, outside React:

```ts
import {
  signInWithGoogle,
  signInWithApple,
  signOutFromGoogle,
  isAppleSignInAvailable,
} from "@pj21/expo-social-auth";

const result = await signInWithGoogle();
if (result.type === "success") {
  console.log(result.idToken, result.accessToken, result.user.email);
}

// Only show the Apple button where it's supported (iOS 13+)
const showApple = await isAppleSignInAvailable();
```

## API

### Functions

| Function | Description |
| --- | --- |
| `configureGoogleSignIn(config)` | Store Google config; applied lazily on first sign-in. Safe to call anywhere, including Expo Go. |
| `signInWithGoogle()` | Runs the Google flow → `Promise<SocialAuthResult>` |
| `signOutFromGoogle()` | Revokes access and signs out. Never throws. |
| `isGoogleSignInAvailable()` | `true` if the native Google module is installed/linked |
| `signInWithApple(options?)` | Runs the Apple flow → `Promise<SocialAuthResult>` |
| `isAppleSignInAvailable()` | `Promise<boolean>` — iOS 13+ with the module installed |
| `useSocialAuth()` | React hook wrapping all of the above with `loading` state |

### `configureGoogleSignIn(config)` options

| Option | Required | Description |
| --- | --- | --- |
| `webClientId` | **Yes** | Web client ID from Google Cloud Console — without it Google returns no `idToken` |
| `iosClientId` | No | iOS client ID; omit when using Firebase (read from `GoogleService-Info.plist`) |
| `scopes` | No | Extra OAuth scopes (default: `email`, `profile`) |
| `offlineAccess` | No | Request a server auth code for offline access |
| `hostedDomain` | No | Restrict sign-in to a Google Workspace domain |
| `profileImageSize` | No | Requested avatar size in pixels |

### `signInWithApple(options?)` options

| Option | Required | Description |
| --- | --- | --- |
| `requestedScopes` | No | Array of `"fullName"` / `"email"` (default: both) |

### `SocialAuthResult`

```ts
type SocialAuthResult =
  | {
      type: "success";
      provider: "google" | "apple";
      idToken: string;            // JWT — verify on your backend
      accessToken?: string;       // Google only
      authorizationCode?: string; // Apple only
      user: SocialUser;
    }
  | { type: "cancelled"; provider: "google" | "apple" }
  | {
      type: "error";
      provider: "google" | "apple";
      code: SocialAuthErrorCode;
      message: string;
      underlyingError?: unknown;
    };
```

Error codes: `module_not_available`, `play_services_not_available`, `in_progress`, `not_supported`, `no_id_token`, `unknown`.

### `SocialUser`

```ts
type SocialUser = {
  id: string;
  email: string | null;
  name: string | null;
  givenName: string | null;
  familyName: string | null;
  photo: string | null; // always null for Apple
};
```

> ⚠️ **Apple only returns `email` and name on the very first sign-in** for a given Apple ID. Persist them on your backend immediately, or decode them from the `idToken` claims.

## Backend verification

Never trust the client — always verify the `idToken` server-side:

- **Google**: verify the JWT against `https://www.googleapis.com/oauth2/v3/certs` and check `aud` equals your **web client ID**.
- **Apple**: verify against `https://appleid.apple.com/auth/keys` and check `aud` equals your bundle ID.

## License

MIT
