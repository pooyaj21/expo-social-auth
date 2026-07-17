# expo-social-auth

Google and Apple sign-in for **Expo / React Native** apps with one unified, fully-typed API.

- ✅ One result shape for every provider — a discriminated union (`success` / `cancelled` / `error`), no try/catch needed
- ✅ Returns the provider `idToken` ready to send to your backend for verification
- ✅ Safe in **Expo Go** — native modules are loaded lazily, so nothing crashes; you get a clean `module_not_available` error instead
- ✅ Providers are **optional peer dependencies** — install only what you use
- ✅ Zero runtime dependencies of its own

## Installation

```sh
npx expo install expo-social-auth
```

Then install the provider(s) you need:

```sh
# Google
npx expo install @react-native-google-signin/google-signin

# Apple
npx expo install expo-apple-authentication
```

> Both providers require native code, so you need a [development build](https://docs.expo.dev/develop/development-builds/introduction/) (`npx expo run:ios` / `run:android`). They do **not** work in Expo Go.

## Setup

### Google

1. Create OAuth client IDs in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — you need a **Web** client ID (for the `idToken`) and platform client IDs (iOS/Android).
2. Add the config plugin to `app.json` / `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "@react-native-google-signin/google-signin",
        {
          "iosUrlScheme": "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID"
        }
      ]
    ]
  }
}
```

3. Configure once at app startup (e.g. in your root layout):

```ts
import { configureGoogleSignIn } from "expo-social-auth";

configureGoogleSignIn({
  webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
  iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
});
```

### Apple

1. Enable the **Sign In with Apple** capability for your app identifier in the Apple Developer portal.
2. Add to `app.json` / `app.config.js`:

```json
{
  "expo": {
    "ios": { "usesAppleSignIn": true },
    "plugins": ["expo-apple-authentication"]
  }
}
```

## Usage

### With the hook

```tsx
import { useSocialAuth } from "expo-social-auth";

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
} from "expo-social-auth";

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
