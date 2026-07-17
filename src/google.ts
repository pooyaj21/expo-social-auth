import { isNativeModuleMissingError } from "./nativeModule";
import type {
  GoogleAuthConfig,
  SocialAuthResult,
  SocialUser,
} from "./types";

type GoogleSigninModule =
  typeof import("@react-native-google-signin/google-signin");

let cachedModule: GoogleSigninModule | null | undefined;
let pendingConfig: GoogleAuthConfig | null = null;
let configured = false;

/**
 * The native module is loaded lazily so that apps running in Expo Go (or apps
 * that only use Apple sign-in) don't crash at import time.
 */
function getGoogleModule(): GoogleSigninModule | null {
  if (cachedModule === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cachedModule = require("@react-native-google-signin/google-signin");
    } catch {
      cachedModule = null;
    }
  }
  return cachedModule ?? null;
}

/** True when `@react-native-google-signin/google-signin` is installed and linked. */
export function isGoogleSignInAvailable(): boolean {
  return getGoogleModule() !== null;
}

/**
 * Store the Google configuration. Safe to call at app startup — it is applied
 * lazily on the first `signInWithGoogle()` call, and is a no-op when the
 * native module is unavailable (e.g. Expo Go).
 */
export function configureGoogleSignIn(config: GoogleAuthConfig): void {
  pendingConfig = config;
  configured = false;
}

function ensureConfigured(module: GoogleSigninModule): void {
  if (configured || !pendingConfig) return;
  module.GoogleSignin.configure(pendingConfig);
  configured = true;
}

function toSocialUser(
  user: import("@react-native-google-signin/google-signin").User["user"],
): SocialUser {
  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
    givenName: user.givenName ?? null,
    familyName: user.familyName ?? null,
    photo: user.photo ?? null,
  };
}

export async function signInWithGoogle(): Promise<SocialAuthResult> {
  const module = getGoogleModule();
  if (!module) {
    return {
      type: "error",
      provider: "google",
      code: "module_not_available",
      message:
        "@react-native-google-signin/google-signin is not installed or not linked. " +
        "Google Sign-In does not work in Expo Go — use a development build.",
    };
  }

  const { GoogleSignin, statusCodes } = module;

  try {
    ensureConfigured(module);
    await GoogleSignin.hasPlayServices();

    let googleUser = GoogleSignin.getCurrentUser();
    if (!googleUser || !GoogleSignin.hasPreviousSignIn()) {
      const response = await GoogleSignin.signIn();
      if (response.type !== "success" || !response.data) {
        return { type: "cancelled", provider: "google" };
      }
      googleUser = response.data;
    }

    const { accessToken, idToken } = await GoogleSignin.getTokens();
    if (!idToken) {
      return {
        type: "error",
        provider: "google",
        code: "no_id_token",
        message:
          "Google returned no idToken. Make sure `webClientId` is set to your " +
          "Web client ID from Google Cloud Console.",
      };
    }

    return {
      type: "success",
      provider: "google",
      idToken,
      accessToken,
      user: toSocialUser(googleUser.user),
    };
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (isNativeModuleMissingError(error)) {
      return {
        type: "error",
        provider: "google",
        code: "module_not_available",
        message:
          "The Google Sign-In native module is not in this binary. It doesn't " +
          "work in Expo Go, and may be excluded via expo.autolinking.exclude — " +
          "rebuild your development build after changing native modules.",
        underlyingError: error,
      };
    }
    if (err.code === statusCodes.SIGN_IN_CANCELLED) {
      return { type: "cancelled", provider: "google" };
    }
    if (err.code === statusCodes.IN_PROGRESS) {
      return {
        type: "error",
        provider: "google",
        code: "in_progress",
        message: "A Google sign-in flow is already in progress.",
        underlyingError: error,
      };
    }
    if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        type: "error",
        provider: "google",
        code: "play_services_not_available",
        message: "Google Play Services are not available or outdated.",
        underlyingError: error,
      };
    }
    return {
      type: "error",
      provider: "google",
      code: "unknown",
      message: err.message ?? "Google sign-in failed.",
      underlyingError: error,
    };
  }
}

/** Signs out and revokes access. Never throws. */
export async function signOutFromGoogle(): Promise<void> {
  const module = getGoogleModule();
  if (!module) return;
  try {
    await module.GoogleSignin.revokeAccess();
    await module.GoogleSignin.signOut();
  } catch {
    // Already signed out or token revoked — nothing to do.
  }
}
