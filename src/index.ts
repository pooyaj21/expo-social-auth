export {
  configureGoogleSignIn,
  isGoogleSignInAvailable,
  signInWithGoogle,
  signOutFromGoogle,
} from "./google";
export { isAppleSignInAvailable, signInWithApple } from "./apple";
export { useSocialAuth } from "./hooks";
export type {
  AppleAuthOptions,
  GoogleAuthConfig,
  SocialAuthCancelled,
  SocialAuthError,
  SocialAuthErrorCode,
  SocialAuthResult,
  SocialAuthSuccess,
  SocialProvider,
  SocialUser,
} from "./types";
