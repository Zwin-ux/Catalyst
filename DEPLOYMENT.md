# Catalyst Discord Bot: Deployment Guide

This guide will walk you through the process of deploying the Catalyst Discord bot for beta testing.

## Prerequisites

Before you begin, make sure you have:

1. Node.js v16.9.0 or higher installed
2. A Discord account with the ability to create applications
3. A Supabase account for the database (free tier is sufficient)

## Step 1: Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name (e.g., "Catalyst Bot")
3. Navigate to the "Bot" tab and click "Add Bot"
4. Under the "Privileged Gateway Intents" section, enable:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
5. Click "Reset Token" to generate a new bot token
6. Copy the token - you'll need it for the configuration

## Step 2: Set Up Supabase

1. Go to [Supabase](https://supabase.com/) and create a new project
2. Once your project is created, go to the "Settings" > "API" page
3. Copy the "URL" and "service_role key" (not the anon key)
4. You'll need these for the configuration

## Step 3: Configure the Bot

1. Create a `.env` file in the root directory of the project with the following content:

```
DISCORD_BOT_TOKEN=your_discord_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
BOT_PREFIX=!
```

2. Replace the placeholders with your actual values

## Step 4: Initialize the Database

1. Run the database initialization script:

```bash
npm run init-db
```

This will create all the necessary tables in your Supabase database.

## Step 5: Invite the Bot to Your Server

1. Go back to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Navigate to the "OAuth2" > "URL Generator" tab
4. Select the following scopes:
   - bot
   - applications.commands
5. Select the following bot permissions:
   - Administrator (for testing purposes; you can refine this later)
6. Copy the generated URL and open it in your browser
7. Select the server you want to add the bot to and click "Authorize"

## Step 6: Start the Bot

1. Install dependencies:

```bash
npm install
```

2. Build the TypeScript code:

```bash
npm run build
```

3. Start the bot:

```bash
npm start
```

## Testing the Bot

Once the bot is running, you can test it with the following commands:

- `!help` - View all available commands
- `!status` - Check bot status and connection information
- `!faction create <name> [description]` - Create a new faction
- `!faction join <name>` - Join an existing faction
- `!faction leave` - Leave your current faction
- `!faction info [name]` - View info about a faction or your own faction
- `!faction list` - List all factions

## Monitoring and Troubleshooting

- Check the console output for any errors or warnings
- The bot will log important events to the console
- If the bot disconnects, check your internet connection and Discord's status

## Beta Testing Checklist

During beta testing, focus on these key areas:

1. **Core Functionality**
   - Command handling
   - Event detection
   - Drama scoring

2. **User Experience**
   - Command responsiveness
   - Clarity of messages
   - Ease of use

3. **Stability**
   - Uptime
   - Error handling
   - Resource usage

4. **Security**
   - Permission handling
   - Data storage
   - API usage

## Reporting Issues

When reporting issues, please include:

1. A description of what happened
2. Steps to reproduce the issue
3. Any error messages from the console
4. The expected behavior

## Next Steps After Beta

After successful beta testing, consider:

1. Refining permissions to use the principle of least privilege
2. Setting up a production hosting environment
3. Implementing automated backups for the database
4. Adding monitoring and alerting

---

Happy testing! The Catalyst bot is designed to evolve with your community, so your feedback during beta testing is invaluable.
