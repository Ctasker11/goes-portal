// Runtime assertion helper. Use at trust boundaries (API handlers, RPC
// callers, parsing external payloads) to check pre/post-conditions that
// TypeScript types alone cannot guarantee.

export function assertDefined<T>(
  value: T | null | undefined,
  name: string,
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(
      `Assertion failed: ${name} is ${value === null ? "null" : "undefined"}`,
    );
  }
}
