import { Plugin } from '../../engine/types';

export const manifest = {
  name: "Emoji Voting",
  version: "1.0.0",
  author: "Catalyst Team",
  description: "Adds emoji voting to channels.",
  entry: "index.ts"
};

export const plugin: Plugin = {
  manifest,
  init(bus) {
    bus.on('messageCreate', async (event) => {
      // Add emoji voting logic here!
    });
  }
};
