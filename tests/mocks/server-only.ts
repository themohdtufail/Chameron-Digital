// Vitest runs outside Next.js's bundler, which is normally what turns the
// "server-only" package into a poisoned import for client bundles and a
// no-op for server ones. Aliased in vitest.config.mts to this empty module
// so server-only.ts files (storage.ts) can be imported directly in tests —
// the test runner never bundles for a browser, so the guard has nothing to
// protect against here.
export {};
