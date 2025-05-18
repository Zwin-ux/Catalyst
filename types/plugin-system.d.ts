import { Client, Message, Interaction } from 'discord.js';
import { WorldStateManager } from '../core/worldState';

declare module '../plugins/pluginManager' {
  export interface CatalystPlugin {
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    requires?: string;
    dependencies?: string[];
    
    onLoad?(manager: PluginManager): Promise<void> | void;
    onUnload?(): Promise<void> | void;
    onMessage?(message: Message): Promise<void> | void;
    onReactionAdd?(reaction: any, user: any): Promise<void> | void;
    onButtonClick?(interaction: any): Promise<void> | void;
    onSlashCommand?(interaction: any): Promise<void> | void;
  }
  
  export class PluginManager {
    constructor(worldState: WorldStateManager, pluginsDir?: string);
    
    loadAllPlugins(): Promise<void>;
    loadPlugin(pluginDir: string): Promise<void>;
    unloadPlugin(pluginId: string): Promise<boolean>;
    reloadPlugin(pluginId: string): Promise<boolean>;
    getPlugin<T extends CatalystPlugin = CatalystPlugin>(pluginId: string): T | undefined;
    getAllPlugins(): CatalystPlugin[];
    
    emit(event: 'message', message: Message): Promise<void>;
    emit(event: 'reactionAdd', reaction: any, user: any): Promise<void>;
    emit(event: 'buttonClick', interaction: any): Promise<void>;
    emit(event: 'slashCommand', interaction: any): Promise<void>;
    emit(event: string, ...args: any[]): Promise<void>;
  }
  
  export const pluginManager: PluginManager;
}
