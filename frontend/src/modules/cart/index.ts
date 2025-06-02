// Public API for cart module. Only import from './types'.
export * from './types';

// TODO: Refactor to provide a public API for cart types without direct model imports.
// Currently, direct imports from './models/cart' are restricted by ESLint.
// Consider moving shared types to a 'types' or 'public' file.

export type { CartItem } from './models/cart';
