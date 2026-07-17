import { useCallback, useRef, useState } from "react";
import { signInWithApple } from "./apple";
import { signInWithGoogle, signOutFromGoogle } from "./google";
import type {
  AppleAuthOptions,
  SocialAuthResult,
  SocialProvider,
} from "./types";

type UseSocialAuthReturn = {
  /** True while any sign-in flow is running. */
  loading: boolean;
  /** The provider currently signing in, or null. */
  activeProvider: SocialProvider | null;
  /** Result of the last completed sign-in attempt. */
  lastResult: SocialAuthResult | null;
  signInWithGoogle: () => Promise<SocialAuthResult>;
  signInWithApple: (options?: AppleAuthOptions) => Promise<SocialAuthResult>;
  signIn: (
    provider: SocialProvider,
    options?: AppleAuthOptions,
  ) => Promise<SocialAuthResult>;
  signOut: () => Promise<void>;
};

/**
 * Unified hook for Google + Apple sign-in.
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
    () => run("google", signInWithGoogle),
    [run],
  );

  const apple = useCallback(
    (options?: AppleAuthOptions) =>
      run("apple", () => signInWithApple(options)),
    [run],
  );

  const signIn = useCallback(
    (provider: SocialProvider, options?: AppleAuthOptions) =>
      provider === "google" ? google() : apple(options),
    [google, apple],
  );

  const signOut = useCallback(async () => {
    await signOutFromGoogle();
    // Apple has no sign-out API; session state is your backend's concern.
  }, []);

  return {
    loading: activeProvider !== null,
    activeProvider,
    lastResult,
    signInWithGoogle: google,
    signInWithApple: apple,
    signIn,
    signOut,
  };
}
