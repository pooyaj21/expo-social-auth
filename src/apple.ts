import { Platform } from "react-native";
import { isNativeModuleMissingError } from "./nativeModule";
import type { AppleAuthOptions, SocialAuthResult } from "./types";

type AppleAuthModule = typeof import("expo-apple-authentication");

let cachedModule: AppleAuthModule | null | undefined;

function getAppleModule(): AppleAuthModule | null {
  if (cachedModule === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cachedModule = require("expo-apple-authentication");
    } catch {
      cachedModule = null;
    }
  }
  return cachedModule ?? null;
}

/** True on iOS devices that support Sign in with Apple (iOS 13+). */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  const module = getAppleModule();
  if (!module) return false;
  try {
    return await module.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(
  options?: AppleAuthOptions,
): Promise<SocialAuthResult> {
  const module = getAppleModule();
  if (!module) {
    return {
      type: "error",
      provider: "apple",
      code: "module_not_available",
      message: "expo-apple-authentication is not installed.",
    };
  }
  if (Platform.OS !== "ios") {
    return {
      type: "error",
      provider: "apple",
      code: "not_supported",
      message: "Apple Sign-In is only available on iOS.",
    };
  }

  const scopes = options?.requestedScopes ?? ["fullName", "email"];
  const requestedScopes = scopes.map((scope) =>
    scope === "fullName"
      ? module.AppleAuthenticationScope.FULL_NAME
      : module.AppleAuthenticationScope.EMAIL,
  );

  try {
    const credential = await module.signInAsync({ requestedScopes });

    if (!credential.identityToken) {
      return {
        type: "error",
        provider: "apple",
        code: "no_id_token",
        message: "Apple returned no identityToken.",
      };
    }

    const givenName = credential.fullName?.givenName ?? null;
    const familyName = credential.fullName?.familyName ?? null;
    const name =
      [givenName, familyName].filter(Boolean).join(" ") || null;

    return {
      type: "success",
      provider: "apple",
      idToken: credential.identityToken,
      authorizationCode: credential.authorizationCode ?? undefined,
      user: {
        id: credential.user,
        // Only present on the very first sign-in for this Apple ID.
        email: credential.email ?? null,
        name,
        givenName,
        familyName,
        photo: null,
      },
    };
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (isNativeModuleMissingError(error)) {
      return {
        type: "error",
        provider: "apple",
        code: "module_not_available",
        message:
          "The Apple Authentication native module is not in this binary. It " +
          "doesn't work in Expo Go, and may be excluded via " +
          "expo.autolinking.exclude — rebuild your development build after " +
          "changing native modules.",
        underlyingError: error,
      };
    }
    if (err.code === "ERR_REQUEST_CANCELED") {
      return { type: "cancelled", provider: "apple" };
    }
    return {
      type: "error",
      provider: "apple",
      code: "unknown",
      message: err.message ?? "Apple sign-in failed.",
      underlyingError: error,
    };
  }
}
