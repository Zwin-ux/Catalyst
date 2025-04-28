# Catalyst Discord Gamification Engine

**Catalyst** is a modular, fully interactive Discord bot engine for gamifying voice and text communities. It features dynamic channel management, emoji voting, interactive modals for settings, plugin proposals, drama timeline analytics, and more. Designed for community-driven play, minimal commands, and maximum fun.

---

## Features
- **Dynamic Channels**: Auto-create/fetch/delete modular channels (`hub`, `config`, `powers`, `mods`, `timeline`).
- **Emoji Voting**: Add emoji voting to any event, plugin proposal, or drama post. Results are posted in-channel.
- **Interactive Modals**: Change settings (role name, server size, vote thresholds) using Discord modals in the `config` channel.
- **Plugin Proposals**: Propose/vote on new features or mechanics in `mods`.
- **Drama Timeline & Analytics**: All major events and changes are logged to `timeline` for transparency and analytics.
- **No Slash Commands Needed**: All gameplay and settings are managed via channel UIs, buttons, and modals.

## Tech Stack
- Node.js + TypeScript
- discord.js
- PostgreSQL (for persistent storage)
- node-fetch

## Quick Start
1. Clone the repo: `git clone https://github.com/Zwin-ux/Catalyst.git`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your config.
4. Start dev server: `npm run dev`

## Environment Variables
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `SOVEREIGN_ROLE_NAME` - Name for the Sovereign role
- `ANNOUNCE_CHANNEL` - Channel for announcements
- `POINTS_API` - API URL for points management
- `SOVEREIGN_PROMPT` - Prompt for new Sovereign
- `SERVER_SIZE` - Server size (small, medium, large)

## Project Structure
- `/bot` - Discord bot logic (TypeScript)
- `/src` - API, models, and backend logic
- `/docs` - Design docs and planning

## Major Functions & Utilities
- `ensureEngineChannel(guild, name, topic)`: Ensure a channel exists
- `deleteEngineChannel(guild, name)`: Delete a channel
- `addEmojiVoting(channel, messageId, emojis, onFinish)`: Emoji voting utility
- `setEngineConfig(options)`: Update engine config

## TODO
- [ ] Interactive settings modals in `config`
- [ ] Final lint/type cleanup

## Repository
[https://github.com/Zwin-ux/Catalyst](https://github.com/Zwin-ux/Catalyst)

---

This project is designed for extensibility, community engagement, and visual gameplay. For feature requests, issues, or contributions, open a PR or issue on GitHub.
