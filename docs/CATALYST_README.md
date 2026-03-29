# Catalyst Runtime Guide

## Positioning

Catalyst is a hosted Discord season service for creator and fandom communities.

The current product loop is:

- admins configure the room with `/setup`
- members explicitly opt in with `/join`
- crews build momentum through rituals and board movement
- moderators and members can summarize the room on demand
- anyone can leave with `/optout`

## Runtime Shape

The canonical runtime is the `src/` tree.

- [`src/index.ts`](../src/index.ts) boots HTTP, health, shutdown handling, and the Discord runtime.
- [`src/catalyst/service.ts`](../src/catalyst/service.ts) owns guild setup, seasons, consent, crews, and summaries.
- [`src/catalyst/store.ts`](../src/catalyst/store.ts) chooses Postgres-backed state when `DATABASE_URL` exists and falls back to JSON for local development.
- [`src/discord/runtime.ts`](../src/discord/runtime.ts) registers slash commands, message context actions, and button flows.
- [`src/discord/presenters.ts`](../src/discord/presenters.ts) defines the control-deck embed language.
- [`src/discord/summaries.ts`](../src/discord/summaries.ts) builds Discord-native channel summaries from command-triggered history access.

Legacy directories like `bot/`, `commands/`, `actions/`, and parts of `plugins/` still exist, but they are not the primary v1 runtime path.

## Discord App Surfaces

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

Context action:

- `Summarize From Here`

This setup deliberately leans on Discord interactions and channel-history fetches instead of building around Message Content Intent.

## Data Model

The hosted flow is built around:

- guild installations
- seasons
- season memberships
- consent records
- season events
- season summaries

For Railway production, state should live in Postgres through `DATABASE_URL`.
For local development, the fallback store uses `CATALYST_STATE_FILE` and defaults to `./data/catalyst-state.json`.

## API Endpoints

- `GET /health`
- `GET /catalyst/health`
- `GET /catalyst/guilds/:guildId`
- `GET /catalyst/guilds/:guildId/leaderboard`

## Railway Notes

The repo now includes [railway.toml](../railway.toml), which sets:

- build command
- pre-deploy database setup
- start command
- healthcheck path
- restart policy
- deploy teardown overlap and drain timing

The database setup entrypoint is [scripts/setup-db.js](../scripts/setup-db.js).

## Environment

Create a `.env` file from [`.env.example`](../.env.example).

Required for Discord runtime:

- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`

Recommended for Railway:

- `DATABASE_URL`
- `DISCORD_DEV_GUILD_ID` for a staging guild during fast iteration

Optional:

- `POSTGRES_URL`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `CATALYST_STATE_FILE`

## Verification Commands

- `npm run build`
- `npm test -- --runInBand`
- `npm run db:setup`

## Immediate Next Shipping Tasks

- add weekly ritual scheduling and streak refresh
- add richer season recaps and multi-surface summaries
- move from single JSON-runtime fallback toward fuller normalized Postgres persistence
- continue retiring unused legacy bot paths
- replace placeholder visual assets with polished control-deck artwork
