declare module '*.css';

// Jest runs in Node.js where 'global' is the global object (alias for globalThis).
// Declared here so TypeScript recognises it in test files under bundler moduleResolution.
declare var global: Record<string, unknown>;
