// BRIDGE FILE: This is a transitional bridge file as we migrate to modular architecture
// This file will be deprecated once all imports are migrated to the module pattern

// Re-export all types from the types file
export * from './storefrontEditor.types';

// TODO: Migrate to direct module imports
// As noted in architectural decisions, bridge files create technical debt
// Future imports should use: import type { StorefrontConfig } from '@/modules/storefront/models/types';