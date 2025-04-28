import { EventBus } from './eventBus';

export interface Plugin {
  manifest: PluginManifest;
  init: (bus: EventBus) => void;
}

export interface PluginManifest {
  name: string;
  version: string;
  author: string;
  description: string;
  entry: string;
  permissions?: string[];
}
