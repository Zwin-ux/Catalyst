# Catalyst Plugin Engine

Catalyst should not stop at one board and one summary command.

The long-term shape is a Discord-native engine with stable module hooks:

- rituals that restart quiet rooms
- summaries that collapse scrollback into action
- season mechanics that create repeat participation
- spotlight and showdown modules that create spikes of attention

## Current Module Contract

Every module in Catalyst should declare:

- `id`
- `name`
- `status`
- `category`
- `cadence`
- `description`
- `whyItSticks`
- `commands`
- `hooks`

The current module manifest lives in [src/catalyst/modules.ts](../src/catalyst/modules.ts).

## Live Modules

- `season-board`
- `channel-digest`
- `question-loop`

## Platform Direction

Catalyst plugins should be safe by default:

- explicit Discord interactions first
- no ambient scraping as the core product dependency
- guild-scoped state only
- clear consent boundaries for any scoring or participation logic

## Hook Direction

Planned hook families:

- `ritual:*`
- `summary:*`
- `season:*`
- `spotlight:*`
- `showdown:*`
- `plugin:*`

## Railway Product Readiness

For Railway deployment, the plugin story does not need a marketplace on day one.
It does need a clear shape:

- module manifest available over HTTP
- product copy that explains the engine
- Discord surfaces that already behave like installable modules

That is the current v1 position.
