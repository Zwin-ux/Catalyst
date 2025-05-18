// Re-export the FactionSystemPlugin from the implementation file
export { default } from './factionPlugin';

// Export types and utilities for other modules to use
export * from './config';
export * from './utils';

// Export the plugin type for type safety
export type { FactionSystemConfig } from './config';
