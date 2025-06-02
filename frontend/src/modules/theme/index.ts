// Public API for theme module. Only import from './types'.
export * from './types';

// TODO: Refactor to provide a public API for theme types without direct model imports.
// Currently, direct imports from './models/theme' are restricted by ESLint.
// Consider moving shared types to a 'types' or 'public' file.

export type { Theme } from './models/theme';
