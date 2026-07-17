import { isNativeModuleMissingError } from "./nativeModule";
import type { FacebookAuthOptions, SocialAuthResult } from "./types";

type FbsdkModule = typeof import("react-native-fbsdk-next");

let cachedModule: FbsdkModule | null | undefined;

function getFacebookModule(): FbsdkModule | null {
  if (cachedModule === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cachedModule = require("react-native-fbsdk-next");
    } catch {
      cachedModule = null;
    }
  }
  return cachedModule ?? null;
}

/** True when `react-native-fbsdk-next` is installed and linked. */
export function isFacebookSignInAvailable(): boolean {
  return getFacebookModule() !== null;
}

export async function signInWithFacebook(
  options?: FacebookAuthOptions,
): Promise<SocialAuthResult> {
  const module = getFacebookModule();
  if (!module) {
    return {
      type: "error",
      provider: "facebook",
      code: "module_not_available",
      message:
        "react-native-fbsdk-next is not installed or not linked. Facebook " +
        "Login does not work in Expo Go — use a development build.",
    };
  }

  const { LoginManager, AccessToken, Profile } = module;

  try {
    const permissions = options?.permissions ?? ["public_profile", "email"];
    const result = await LoginManager.logInWithPermissions(permissions);

    if (result.isCancelled) {
      return { type: "cancelled", provider: "facebook" };
    }

    const token = await AccessToken.getCurrentAccessToken();
    if (!token?.accessToken) {
      return {
        type: "error",
        provider: "facebook",
        code: "no_id_token",
        message: "Facebook returned no access token.",
      };
    }

    // Best-effort profile enrichment — sign-in shouldn't fail because of it.
    let profile: import("react-native-fbsdk-next").Profile | null = null;
    try {
      profile = await Profile.getCurrentProfile();
    } catch {
      profile = null;
    }

    const accessToken = token.accessToken.toString();
    return {
      type: "success",
      provider: "facebook",
      // For Facebook the access token IS what your backend verifies.
      idToken: accessToken,
      accessToken,
      user: {
        id: token.userID,
        email: profile?.email ?? null,
        name: profile?.name ?? null,
        givenName: profile?.firstName ?? null,
        familyName: profile?.lastName ?? null,
        photo: profile?.imageURL ?? null,
      },
    };
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (isNativeModuleMissingError(error)) {
      return {
        type: "error",
        provider: "facebook",
        code: "module_not_available",
        message:
          "The Facebook SDK native module is not in this binary. It doesn't " +
          "work in Expo Go, and may be excluded via expo.autolinking.exclude — " +
          "rebuild your development build after changing native modules.",
        underlyingError: error,
      };
    }
    return {
      type: "error",
      provider: "facebook",
      code: "unknown",
      message: err.message ?? "Facebook sign-in failed.",
      underlyingError: error,
    };
  }
}

/** Logs out of Facebook. Never throws. */
export async function signOutFromFacebook(): Promise<void> {
  const module = getFacebookModule();
  if (!module) return;
  try {
    module.LoginManager.logOut();
  } catch {
    // Already logged out — nothing to do.
  }
}
