export type SocialProvider = "google" | "apple" | "facebook";

/**
 * Normalized user profile across providers.
 * Apple only returns `email` / name fields on the FIRST sign-in for a given
 * Apple ID — persist them on your backend immediately.
 */
export type SocialUser = {
  id: string;
  email: string | null;
  name: string | null;
  givenName: string | null;
  familyName: string | null;
  photo: string | null;
};

export type SocialAuthErrorCode =
  /** Native module is not installed / not linked (e.g. running in Expo Go). */
  | "module_not_available"
  /** Google Play Services missing or outdated (Android only). */
  | "play_services_not_available"
  /** A sign-in flow is already in progress. */
  | "in_progress"
  /** Apple Sign-In not supported on this device/OS. */
  | "not_supported"
  /** Provider returned no identity token. */
  | "no_id_token"
  | "unknown";

export type SocialAuthSuccess = {
  type: "success";
  provider: SocialProvider;
  /**
   * The token to verify on your backend: Google `idToken` / Apple
   * `identityToken` (JWTs), or the Facebook access token.
   */
  idToken: string;
  /** Google and Facebook. */
  accessToken?: string;
  /** Apple only — one-time code, exchangeable server-side. */
  authorizationCode?: string;
  user: SocialUser;
};

export type SocialAuthCancelled = {
  type: "cancelled";
  provider: SocialProvider;
};

export type SocialAuthError = {
  type: "error";
  provider: SocialProvider;
  code: SocialAuthErrorCode;
  message: string;
  /** The original error thrown by the underlying SDK, if any. */
  underlyingError?: unknown;
};

export type SocialAuthResult =
  | SocialAuthSuccess
  | SocialAuthCancelled
  | SocialAuthError;

/** Subset of `@react-native-google-signin/google-signin` ConfigureParams. */
export type GoogleAuthConfig = {
  /** Web client ID from Google Cloud Console — required for `idToken`. */
  webClientId: string;
  /** iOS client ID; falls back to the value in your Info.plist / config plugin. */
  iosClientId?: string;
  scopes?: string[];
  offlineAccess?: boolean;
  hostedDomain?: string;
  profileImageSize?: number;
};

export type AppleAuthOptions = {
  /** Defaults to requesting both full name and email. */
  requestedScopes?: ("fullName" | "email")[];
};

export type FacebookAuthOptions = {
  /** Defaults to `["public_profile", "email"]`. */
  permissions?: string[];
};
