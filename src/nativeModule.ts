/**
 * Detects "native module is missing" errors — thrown when the JS package is
 * installed but its native code isn't in the binary (Expo Go, or excluded via
 * `expo.autolinking.exclude` in package.json).
 */
export function isNativeModuleMissingError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("could not be found") ||
    message.includes("Cannot find native module") ||
    message.includes("TurboModuleRegistry")
  );
}
