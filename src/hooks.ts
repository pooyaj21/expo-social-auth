import { useCallback, useRef, useState } from "react";
import { signInWithApple } from "./apple";
import { signInWithFacebook, signOutFromFacebook } from "./facebook";
import { signInWithGoogle, signOutFromGoogle } from "./google";
import type {
  AppleAuthOptions,
  FacebookAuthOptions,
  GoogleAuthOptions,
  SocialAuthResult,
  SocialProvider,
} from "./types";

type SignInOptions = AppleAuthOptions & FacebookAuthOptions & GoogleAuthOptions;

type UseSocialAuthReturn = {
  /** True while any sign-in flow is running. */
  loading: boolean;
  /** The provider currently signing in, or null. */
  activeProvider: SocialProvider | null;
  /** Result of the last completed sign-in attempt. */
  lastResult: SocialAuthResult | null;
  signInWithGoogle: (options?: GoogleAuthOptions) => Promise<SocialAuthResult>;
  signInWithApple: (options?: AppleAuthOptions) => Promise<SocialAuthResult>;
  signInWithFacebook: (
    options?: FacebookAuthOptions,
  ) => Promise<SocialAuthResult>;
  signIn: (
    provider: SocialProvider,
    options?: SignInOptions,
  ) => Promise<SocialAuthResult>;
  signOut: () => Promise<void>;
};

/**
 * Unified hook for Google + Apple + Facebook sign-in.
 *
 * ```tsx
 * const { signIn, loading } = useSocialAuth();
 *
 * const onGooglePress = async () => {
 *   const result = await signIn("google");
 *   if (result.type === "success") {
 *     api.loginSocial({ token: result.idToken, oauth_platform: "Google" });
 *   }
 * };
 * ```
 */
export function useSocialAuth(): UseSocialAuthReturn {
  const [activeProvider, setActiveProvider] = useState<SocialProvider | null>(
    null,
  );
  const [lastResult, setLastResult] = useState<SocialAuthResult | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(
    async (
      provider: SocialProvider,
      flow: () => Promise<SocialAuthResult>,
    ): Promise<SocialAuthResult> => {
      if (inFlight.current) {
        return {
          type: "error",
          provider,
          code: "in_progress",
          message: "Another sign-in flow is already in progress.",
        };
      }
      inFlight.current = true;
      setActiveProvider(provider);
      try {
        const result = await flow();
        setLastResult(result);
        return result;
      } finally {
        inFlight.current = false;
        setActiveProvider(null);
      }
    },
    [],
  );

  const google = useCallback(
    (options?: GoogleAuthOptions) =>
      run("google", () => signInWithGoogle(options)),
    [run],
  );

  const apple = useCallback(
    (options?: AppleAuthOptions) =>
      run("apple", () => signInWithApple(options)),
    [run],
  );

  const facebook = useCallback(
    (options?: FacebookAuthOptions) =>
      run("facebook", () => signInWithFacebook(options)),
    [run],
  );

  const signIn = useCallback(
    (provider: SocialProvider, options?: SignInOptions) => {
      switch (provider) {
        case "google":
          return google(options);
        case "apple":
          return apple(options);
        case "facebook":
          return facebook(options);
      }
    },
    [google, apple, facebook],
  );

  const signOut = useCallback(async () => {
    await signOutFromGoogle();
    await signOutFromFacebook();
    // Apple has no sign-out API; session state is your backend's concern.
  }, []);

  return {
    loading: activeProvider !== null,
    activeProvider,
    lastResult,
    signInWithGoogle: google,
    signInWithApple: apple,
    signInWithFacebook: facebook,
    signIn,
    signOut,
  };
}
