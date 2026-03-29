# Catalyst

Catalyst is a hosted Discord season engine for creator and fandom communities.

It gives a server one clear loop:

`install -> setup -> join -> weekly rituals -> leaderboard -> recap`

The product target is simple on purpose. Catalyst should feel as clear and habit-forming as Duolingo, but with a premium dev-console shell: dark control-room surfaces, mono accents, crisp progress feedback, and low-friction actions.

## What It Does

- Runs opt-in server seasons with crews, streaks, and leaderboard momentum.
- Keeps consent explicit and reversible with `/join` and `/optout`.
- Uses slash commands, buttons, and bot-authored boards instead of ambient message scraping.
- Summarizes channels and season activity with Discord-native app commands.
- Gives admins a guided setup flow instead of a config dump.
- Exposes a lightweight hosted API for health and season snapshots.

## Core Commands

Admin:

- `/setup`
- `/settings`
- `/season start`
- `/season end`
- `/announce`

Member:

- `/join`
- `/optout`
- `/profile`
- `/leaderboard`
- `/summary channel`
- `/summary season`

Discord app tools:

- `Summarize From Here` message context command
- `/invite` web route for install flow handoff

## Product Principles

- One dominant next action on every major surface.
- Clear consent and easy exit.
- Strong progress feedback: crews, points, streaks, and recent moves.
- Friendly, direct copy with a little bite.
- No generic SaaS dashboards in v1. The product lives inside Discord.

## Local Development

1. Clone the repo.
2. Install dependencies with `npm install`.
3. Copy [`.env.example`](.env.example) to `.env`.
4. Add a Discord bot token and application id if you want the bot runtime enabled.
5. Start the service with `npm run dev`.

If Discord credentials are not present, the HTTP service still runs and the hosted state layer remains usable for local development and tests.

## Environment Variables

- `PORT`
- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`
- `DISCORD_DEV_GUILD_ID`
- `CATALYST_STATE_FILE`
- `POSTGRES_URL`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `DATABASE_URL`

## API Surface

- `GET /health`
- `GET /invite`
- `GET /catalyst/health`
- `GET /catalyst/guilds/:guildId`
- `GET /catalyst/guilds/:guildId/leaderboard`

## Railway

Catalyst is now set up for Railway-first deployment:

- [railway.toml](railway.toml) defines build, pre-deploy, start, healthcheck, and restart behavior.
- `npm run db:setup` prepares Postgres-backed state before boot.
- `GET /health` is the Railway deploy healthcheck target.
- When `DATABASE_URL` is present, Catalyst stores hosted runtime state in Postgres instead of local JSON.

Use a Railway Postgres service and wire its `DATABASE_URL` into the app service before promoting to production.

## Design Direction

Catalyst should feel like a premium arcade command deck:

- near-black backgrounds
- cyan and ice-blue system accents
- warm ember highlights for wins and alerts
- monospaced status language
- bold celebration moments without cartoon clutter

The original repo screenshots are treated as aesthetic reference only, not as the product finish line.

## Verification

- `npm run build`
- `npm test -- --runInBand`

## Status

This repo now contains the first hosted v1 slice:

- persistent guild setup
- season state and crew assignment
- consent records
- join / opt-out / profile / leaderboard flows
- channel and season summary flows
- Discord command runtime
- Railway deploy contract
- CI verification workflow

More detail lives in [docs/CATALYST_README.md](docs/CATALYST_README.md).
