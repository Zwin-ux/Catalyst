# Catalyst Deployment Guide

This repo is prepared for Railway-first deployment.

The target shape is:

- one Railway app service for Catalyst
- one Railway Postgres service for persistent state
- one Discord application installed to guilds with slash commands, buttons, ritual prompts, and message context actions

## 1. Create the Discord App

In the Discord Developer Portal:

1. Create a new application.
2. Add a bot user.
3. Copy the application id and bot token.
4. On the Installation page, enable guild install.
5. Use the Discord-provided install link or a custom OAuth2 link with:
   - `bot`
   - `applications.commands`
6. Set bot permissions conservatively to start:
   - View Channels
   - Send Messages
   - Embed Links
   - Read Message History
   - Use Slash Commands

Catalyst does not need Message Content Intent for the summary flow in this setup. The app uses explicit command access plus channel history fetches.

## 2. Create the Railway Services

In Railway:

1. Create a new project.
2. Add a Postgres service.
3. Add a GitHub-backed service pointing at this repo.
4. Set the root service to the app codebase.

Railway will detect [railway.toml](railway.toml) and use:

- `npm run build`
- `npm run db:setup`
- `node dist/src/index.js`
- `GET /health`

## 3. Set Variables

Set these variables on the Catalyst service:

- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`
- `DATABASE_URL`
- `DISCORD_DEV_GUILD_ID`
  Use this in development or staging for fast guild-scoped command registration.
- `PUBLIC_BASE_URL`
  Set this to the Railway public URL so the hosted landing page renders canonical links cleanly.

Optional:

- `PORT`
- `POSTGRES_URL`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `CATALYST_STATE_FILE`
  Only matters for non-database local fallback.

For Railway production, `DATABASE_URL` is the important one.

## 4. Database Setup

The pre-deploy command runs:

```bash
npm run db:setup
```

That script:

- applies [db/schema.sql](db/schema.sql)
- creates the `catalyst_runtime_state` table used by the hosted runtime
- seeds the default state row if needed

You can also run it manually:

```bash
npm run db:setup
```

## 5. First Boot Checklist

After deploy:

1. Open the Railway logs and confirm the app is listening on `PORT`.
2. Hit `/health` and confirm a `200` response.
3. Confirm persistence shows as `postgres` in the health payload.
4. Open `/` and confirm the branded landing page renders instead of a raw Express error.
5. Open `/catalyst/modules` and confirm the module rack manifest is live.
6. Install the Discord app into a test guild.
7. Run:
   - `/setup`
   - `/season start`
   - `/announce`
   - `/ritual prompt`
   - `/join`
   - `/summary channel`
   - `Summarize From Here`

## 6. Discord App Features in This Repo

Catalyst now leans on explicit Discord app surfaces:

- slash commands for setup, seasons, profile, ritual, and board flows
- ritual prompt command for restarting quiet rooms
- buttons for season join and board actions
- message context command for targeted channel summarization
- channel history fetch for summaries
- `/invite` route for clean web-to-Discord install handoff

This keeps the app closer to Discord's interaction model and avoids building around privileged ambient scraping.

## 7. Module Rack

The product is now framed as a module rack instead of one monolithic bot.

Current live and beta modules:

- `season-board`
- `channel-digest`
- `question-loop`
- `spotlight-drop`
- `plugin-slots`
- `showdown-engine`

The source of truth is [src/catalyst/modules.ts](src/catalyst/modules.ts).

## 8. Recommended Railway Production Setup

- one replica to start
- Postgres attached before first real deploy
- healthcheck path: `/health`
- restart policy: `ON_FAILURE`
- keep a dedicated staging guild via `DISCORD_DEV_GUILD_ID`
- use Railway logs plus Discord test guilds for smoke testing every deploy

## 9. Smoke Test Script

Before marking a Railway deploy good:

1. `GET /health` returns `ok: true`
2. `GET /catalyst/modules` returns the module manifest
3. `/setup` works in a test guild
4. `/season start` posts a usable season flow
5. `/ritual prompt` posts a usable question-loop prompt
6. `/join` creates a member profile
7. `/summary channel` returns a sane digest
8. `Summarize From Here` works on a selected message
9. `/optout` cleanly exits the season

## 10. Notes

- Local JSON state is still available for development when no database is configured.
- Railway production should use Postgres-backed state.
- Summary commands rely on command-triggered history access, not Message Content Intent.
- The slug-brand assets live in `assets/brand/` and are served directly by the app.
