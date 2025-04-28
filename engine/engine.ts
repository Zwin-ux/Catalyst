import { EventBus } from './eventBus';
import { Plugin, PluginManifest } from './types';

export class CatalystEngine {
  private plugins: Plugin[] = [];
  public eventBus = new EventBus();

  loadPlugin(plugin: Plugin) {
    this.plugins.push(plugin);
    plugin.init(this.eventBus);
  }

  loadPluginsFromManifests(manifests: PluginManifest[]) {
    // Load plugins dynamically (from /plugins folder)
    // For each manifest, require() plugin entry and call loadPlugin
  }
}
