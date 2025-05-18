# Catalyst Plugin System

Catalyst's plugin system allows you to extend the bot's functionality with custom features. This document explains how to create, manage, and work with plugins.

## Table of Contents
- [Plugin Structure](#plugin-structure)
- [Creating a Plugin](#creating-a-plugin)
- [Plugin Lifecycle](#plugin-lifecycle)
- [Plugin Configuration](#plugin-configuration)
- [Accessing Core Services](#accessing-core-services)
- [Best Practices](#best-practices)
- [Example Plugin](#example-plugin)

## Plugin Structure

A Catalyst plugin is a directory with the following structure:

```
my-plugin/
├── src/
│   └── index.ts      # Main plugin file
├── package.json       # Plugin metadata and dependencies
└── tsconfig.json     # TypeScript configuration
```

## Creating a Plugin

1. **Set up the project structure**

   ```bash
   mkdir my-plugin
   cd my-plugin
   npm init -y
   ```

2. **Install required dependencies**

   ```bash
   npm install --save-dev typescript @types/node
   ```

3. **Create a basic plugin** (`src/index.ts`):

   ```typescript
   import { CatalystPlugin } from '@plugins/pluginManager';
   
   const MyPlugin: CatalystPlugin = {
     id: 'my-plugin',
     name: 'My Plugin',
     description: 'A sample Catalyst plugin',
     version: '1.0.0',
     author: 'Your Name',
     
     async onLoad(manager) {
       console.log('My plugin has been loaded!');
     },
     
     async onMessage(message) {
       if (message.content === '!ping') {
         await message.reply('Pong!');
       }
     }
   };
   
   export default MyPlugin;
   ```

4. **Configure TypeScript** (`tsconfig.json`):

   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules"]
   }
   ```

5. **Build your plugin**

   Add these scripts to your `package.json`:
   
   ```json
   {
     "scripts": {
       "build": "tsc",
       "watch": "tsc -w"
     }
   }
   ```
   
   Then run:
   ```bash
   npm run build
   ```

## Plugin Lifecycle

Plugins go through the following lifecycle:

1. **Loading**
   - Plugin files are loaded and validated
   - Dependencies are checked
   - `onLoad()` is called if defined

2. **Runtime**
   - Event handlers are called when events occur
   - Plugins can interact with the bot and other plugins

3. **Unloading**
   - `onUnload()` is called when the plugin is being unloaded
   - Clean up any resources (intervals, listeners, etc.)

## Plugin Configuration

Plugins can have configuration stored in JSON files in the `config` directory. The configuration is automatically loaded and passed to the plugin.

Example configuration (`config/my-plugin.json`):

```json
{
  "enabled": true,
  "someSetting": "value",
  "anotherSetting": 42
}
```

Access configuration in your plugin:

```typescript
const MyPlugin: CatalystPlugin = {
  // ...
  async onLoad(manager) {
    // Access config
    const mySetting = this.config?.someSetting;
    console.log(`Plugin setting: ${mySetting}`);
  }
};
```

## Accessing Core Services

Plugins can access core services through the plugin manager:

```typescript
const MyPlugin: CatalystPlugin = {
  // ...
  async onLoad(manager) {
    // Access world state
    const user = await manager.worldState.getUser('1234567890');
    
    // Access Discord client
    manager.client.on('ready', () => {
      console.log('Bot is ready!');
    });
    
    // Access other plugins
    const otherPlugin = manager.getPlugin('other-plugin');
  }
};
```

## Best Practices

1. **Error Handling**
   - Always wrap async operations in try/catch blocks
   - Log errors using the provided logger

2. **Resource Management**
   - Clean up resources in `onUnload()`
   - Use weak references or dependency injection when possible

3. **Performance**
   - Avoid blocking operations in event handlers
   - Use pagination for large data sets

4. **Security**
   - Validate all user input
   - Use proper permissions checking
   - Don't expose sensitive information in logs

## Example Plugin

Here's a complete example of a simple plugin that responds to messages:

```typescript
import { CatalystPlugin } from '@plugins/pluginManager';

const GreeterPlugin: CatalystPlugin = {
  id: 'greeter',
  name: 'Greeter',
  description: 'Greets users when they join the server',
  version: '1.0.0',
  author: 'Catalyst Team',
  
  async onLoad(manager) {
    console.log('Greeter plugin loaded!');
  },
  
  async onGuildMemberAdd(member) {
    const channel = member.guild.systemChannel;
    if (channel) {
      await channel.send(`Welcome to the server, ${member}! 👋`);
    }
  },
  
  async onMessage(message) {
    if (message.content.toLowerCase() === 'hello') {
      await message.reply('Hello there!');
    }
  },
  
  async onUnload() {
    console.log('Greeter plugin unloaded!');
  }
};

export default GreeterPlugin;
```

## Next Steps

- Explore the example plugins in the `plugins` directory
- Check out the API documentation for more details on available methods and events
- Join our Discord server for support and to share your plugins!
