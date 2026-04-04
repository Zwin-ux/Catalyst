import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  ChannelType,
  Client,
  ContextMenuCommandBuilder,
  GatewayIntentBits,
  GuildBasedChannel,
  Interaction,
  MessageContextMenuCommandInteraction,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';

import { CatalystService, listCatalystModules } from '../catalyst';
import { appConfig } from '../config/appConfig';
import { Logger } from '../utils/logger';
import {
  buildChannelSummaryEmbed,
  buildJoinResultEmbed,
  buildLeaderboardEmbed,
  buildModuleCatalogEmbed,
  buildProfileEmbed,
  buildRitualPromptEmbed,
  buildSeasonAnnouncementActions,
  buildSeasonAnnouncementEmbed,
  buildSeasonSummaryEmbed,
  buildSetupEmbed,
} from './presenters';
import { composeRitualPrompt } from './rituals';
import { SummaryCapableChannel, summarizeChannel } from './summaries';

const logger = new Logger('CatalystDiscord');

const commandDefinitions = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure Catalyst for this server.')
    .addChannelOption((option) =>
      option
        .setName('announce_channel')
        .setDescription('Where Catalyst should post the season board.')
        .addChannelTypes(ChannelType.GuildText),
    )
    .addStringOption((option) =>
      option
        .setName('quiet_hours')
        .setDescription('Quiet hours in HH:MM-HH:MM format.'),
    )
    .addStringOption((option) =>
      option
        .setName('consent_copy')
        .setDescription('Short consent copy shown on the join board.')
        .setMaxLength(300),
    )
    .addStringOption((option) =>
      option.setName('theme').setDescription('Season theme label.').setMaxLength(80),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('View the current Catalyst setup for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('season')
    .setDescription('Start or end the current season.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('start')
        .setDescription('Start a new Catalyst season.')
        .addStringOption((option) =>
          option.setName('name').setDescription('Custom season name.').setMaxLength(100),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('end').setDescription('End the active season.'),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Post or re-post the season board in the announce channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('ritual')
    .setDescription('Fire a high-signal prompt or inspect the Catalyst module rack.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('prompt')
        .setDescription('Post a question-loop prompt into the current channel.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('modules')
        .setDescription('See which Catalyst modules are live, beta, or next.'),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('summary')
    .setDescription('Summarize a Discord channel or the current season.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('channel')
        .setDescription('Summarize the latest messages from a channel or thread.')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel to summarize. Defaults to the current channel.')
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement,
              ChannelType.PublicThread,
              ChannelType.PrivateThread,
              ChannelType.AnnouncementThread,
            ),
        )
        .addIntegerOption((option) =>
          option
            .setName('limit')
            .setDescription('How many recent messages to scan.')
            .setMinValue(10)
            .setMaxValue(100),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('season')
        .setDescription('Summarize the current Catalyst season board and recent moves.'),
    ),
  new SlashCommandBuilder().setName('join').setDescription('Join the current season.'),
  new SlashCommandBuilder().setName('optout').setDescription('Leave the current season.'),
  new SlashCommandBuilder().setName('profile').setDescription('View your season profile.'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('View the current season board.'),
  new ContextMenuCommandBuilder()
    .setName('Summarize From Here')
    .setType(ApplicationCommandType.Message),
].map((command) => command.toJSON());

export async function startCatalystDiscord(service: CatalystService): Promise<Client | null> {
  if (!appConfig.discordToken || !appConfig.discordApplicationId) {
    logger.warn(
      'Discord runtime is disabled. Set DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID to enable it.',
    );
    return null;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once('ready', async () => {
    logger.info(`Connected as ${client.user?.tag || 'unknown bot user'}`);
    await registerCommands();
  });

  client.on('interactionCreate', async (interaction) => {
    try {
      await handleInteraction(client, service, interaction);
    } catch (error) {
      logger.error('Interaction handling failed.', error);
      await replySafely(interaction, {
        content: 'Catalyst hit a snag. Nothing hidden, nothing lost. Try again in a moment.',
        ephemeral: true,
      });
    }
  });

  await client.login(appConfig.discordToken);
  return client;
}

async function registerCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(appConfig.discordToken);
  if (appConfig.discordDevGuildId) {
    await rest.put(
      Routes.applicationGuildCommands(
        appConfig.discordApplicationId,
        appConfig.discordDevGuildId,
      ),
      { body: commandDefinitions },
    );
    logger.info(`Registered guild commands for ${appConfig.discordDevGuildId}`);
    return;
  }

  await rest.put(Routes.applicationCommands(appConfig.discordApplicationId), {
    body: commandDefinitions,
  });
  logger.info('Registered global commands');
}

async function handleInteraction(
  client: Client,
  service: CatalystService,
  interaction: Interaction,
): Promise<void> {
  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(client, service, interaction);
    return;
  }

  if (interaction.isMessageContextMenuCommand()) {
    await handleMessageContextCommand(interaction);
    return;
  }

  if (!interaction.isButton() || !interaction.guildId) {
    return;
  }

  if (interaction.customId === 'catalyst:join') {
    const result = await service.joinSeason(
      interaction.guildId,
      interaction.user.id,
      getDisplayName(interaction),
    );
    await interaction.reply({
      embeds: [buildJoinResultEmbed(result)],
      ephemeral: true,
    });
    return;
  }

  if (interaction.customId === 'catalyst:leaderboard') {
    const overview = await service.getGuildOverview(interaction.guildId);
    if (!overview?.activeSeason) {
      await interaction.reply({
        content: 'There is no active season board yet.',
        ephemeral: true,
      });
      return;
    }

    const leaderboard = await service.getLeaderboard(interaction.guildId);
    const events = await service.getRecentEvents(interaction.guildId);
    await interaction.reply({
      embeds: [buildLeaderboardEmbed(overview.activeSeason, leaderboard, events)],
      ephemeral: true,
    });
  }
}

async function handleSlashCommand(
  client: Client,
  service: CatalystService,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({
      content: 'Catalyst only runs inside a Discord server.',
      ephemeral: true,
    });
    return;
  }

  switch (interaction.commandName) {
    case 'setup': {
      const announceChannel = interaction.options.getChannel('announce_channel');
      await service.configureGuild({
        guildId: interaction.guildId,
        guildName: interaction.guild.name,
        announceChannelId: announceChannel?.id,
        quietHours: interaction.options.getString('quiet_hours') || undefined,
        consentCopy: interaction.options.getString('consent_copy') || undefined,
        theme: interaction.options.getString('theme') || undefined,
      });
      const overview = await service.getGuildOverview(interaction.guildId);
      if (!overview) {
        throw new Error('Guild setup could not be loaded.');
      }
      await interaction.reply({
        embeds: [buildSetupEmbed(overview)],
        ephemeral: true,
      });
      return;
    }
    case 'settings': {
      const overview = await service.getGuildOverview(interaction.guildId);
      if (!overview) {
        await interaction.reply({
          content: 'Catalyst has not been configured yet. Run `/setup` first.',
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({
        embeds: [buildSetupEmbed(overview)],
        ephemeral: true,
      });
      return;
    }
    case 'season': {
      const subcommand = interaction.options.getSubcommand();
      if (subcommand === 'start') {
        const season = await service.startSeason(
          interaction.guildId,
          interaction.options.getString('name') || undefined,
        );
        const overview = await service.getGuildOverview(interaction.guildId);
        if (!overview) {
          throw new Error('Guild overview missing after starting season.');
        }
        const consentCopy = await service.getConsentCopy(interaction.guildId);
        const boardMessage = await postSeasonBoard(client, interaction.guildId, overview, consentCopy, service);

        await interaction.reply({
          content: boardMessage
            ? `Season live. The join board is posted in <#${overview.installation.announceChannelId}>.`
            : `${season.name} is live. Set an announce channel in \`/setup\` to post the join board automatically.`,
          ephemeral: true,
        });
        return;
      }

      const season = await service.endSeason(interaction.guildId);
      await interaction.reply({
        embeds: [buildSeasonSummaryEmbed(season)],
      });
      return;
    }
    case 'announce': {
      const overview = await service.getGuildOverview(interaction.guildId);
      if (!overview?.activeSeason) {
        await interaction.reply({
          content: 'Start a season before posting the board.',
          ephemeral: true,
        });
        return;
      }
      const consentCopy = await service.getConsentCopy(interaction.guildId);
      const boardMessage = await postSeasonBoard(client, interaction.guildId, overview, consentCopy, service);
      await interaction.reply({
        content: boardMessage
          ? `Season board re-posted in <#${overview.installation.announceChannelId}>.`
          : 'Catalyst could not post the board. Check that the announce channel is configured and writable.',
        ephemeral: true,
      });
      return;
    }
    case 'join': {
      const result = await service.joinSeason(
        interaction.guildId,
        interaction.user.id,
        getDisplayName(interaction),
      );
      await interaction.reply({
        embeds: [buildJoinResultEmbed(result)],
        ephemeral: true,
      });
      return;
    }
    case 'ritual': {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'modules') {
        await interaction.reply({
          embeds: [buildModuleCatalogEmbed(listCatalystModules())],
          ephemeral: true,
        });
        return;
      }

      const overview = await service.getGuildOverview(interaction.guildId);
      const prompt = composeRitualPrompt({
        guildName: interaction.guild.name,
        theme: overview?.installation.theme,
        seasonName: overview?.activeSeason?.name,
      });

      await interaction.reply({
        embeds: [buildRitualPromptEmbed(prompt)],
      });
      return;
    }
    case 'summary': {
      const subcommand = interaction.options.getSubcommand();
      if (subcommand === 'channel') {
        const requestedChannel = interaction.options.getChannel('channel');
        const target = (requestedChannel || interaction.channel) as SummaryCapableChannel | null;
        if (!isSummaryCapableChannel(target)) {
          await interaction.reply({
            content: 'This surface cannot be summarized. Use a text channel or thread.',
            ephemeral: true,
          });
          return;
        }

        const summary = await summarizeChannel(target, {
          limit: interaction.options.getInteger('limit') || 30,
        });
        await interaction.reply({
          embeds: [buildChannelSummaryEmbed(summary)],
        });
        return;
      }

      const overview = await service.getGuildOverview(interaction.guildId);
      if (!overview?.activeSeason) {
        await interaction.reply({
          content: 'There is no active season to summarize yet.',
          ephemeral: true,
        });
        return;
      }
      const leaderboard = await service.getLeaderboard(interaction.guildId);
      const events = await service.getRecentEvents(interaction.guildId, 6);
      const seasonSummary = {
        title: `${overview.activeSeason.name} digest`,
        totalMessages: events.length,
        participantCount: overview.activeMembers,
        topParticipants: leaderboard.slice(0, 4).map((entry) => ({
          name: entry.crewName,
          count: entry.points,
        })),
        themes: ['season', 'crews', 'progress', 'recap'],
        highlights:
          events.length > 0
            ? events.map((event) => event.summary).slice(0, 3)
            : ['No live season events yet.'],
        actionItems:
          leaderboard.length > 0
            ? [
                `${leaderboard[0].crewName} leads the board with ${leaderboard[0].points} points.`,
                'Use /announce to refresh the join board if the room needs a new pulse.',
              ]
            : ['Start recruiting with /announce to get the room moving.'],
      };
      await interaction.reply({
        embeds: [buildChannelSummaryEmbed(seasonSummary)],
      });
      return;
    }
    case 'optout': {
      await service.optOut(interaction.guildId, interaction.user.id);
      await interaction.reply({
        content: 'You are out of the current season. No hidden tracking remains active for gameplay in this cycle.',
        ephemeral: true,
      });
      return;
    }
    case 'profile': {
      const profile = await service.getProfile(interaction.guildId, interaction.user.id);
      if (!profile) {
        await interaction.reply({
          content: 'You are not active in the current season yet. Use `/join` when you are ready.',
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({
        embeds: [buildProfileEmbed(profile)],
        ephemeral: true,
      });
      return;
    }
    case 'leaderboard': {
      const overview = await service.getGuildOverview(interaction.guildId);
      if (!overview?.activeSeason) {
        await interaction.reply({
          content: 'There is no active season board yet.',
          ephemeral: true,
        });
        return;
      }
      const leaderboard = await service.getLeaderboard(interaction.guildId);
      const events = await service.getRecentEvents(interaction.guildId);
      await interaction.reply({
        embeds: [buildLeaderboardEmbed(overview.activeSeason, leaderboard, events)],
      });
      return;
    }
  }
}

async function handleMessageContextCommand(
  interaction: MessageContextMenuCommandInteraction,
): Promise<void> {
  const target = interaction.channel as SummaryCapableChannel | null;
  if (!isSummaryCapableChannel(target)) {
    await interaction.reply({
      content: 'Catalyst can only summarize text channels and threads from here.',
      ephemeral: true,
    });
    return;
  }

  const summary = await summarizeChannel(target, {
    aroundMessageId: interaction.targetMessage.id,
    limit: 40,
  });

  await interaction.reply({
    embeds: [buildChannelSummaryEmbed(summary)],
    ephemeral: true,
  });
}

async function postSeasonBoard(
  client: Client,
  guildId: string,
  overview: NonNullable<Awaited<ReturnType<CatalystService['getGuildOverview']>>>,
  consentCopy: string,
  service: CatalystService,
): Promise<boolean> {
  const announceChannelId = overview.installation.announceChannelId;
  if (!announceChannelId) {
    return false;
  }

  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(announceChannelId);
  if (!channel || !isWritableTextChannel(channel)) {
    return false;
  }

  const message = await channel.send({
    embeds: [buildSeasonAnnouncementEmbed(overview, consentCopy)],
    components: [buildSeasonAnnouncementActions()],
  });
  await service.markSeasonAnnouncement(guildId, message.id);
  return true;
}

function isWritableTextChannel(
  channel: GuildBasedChannel | null,
): channel is GuildBasedChannel & { send: (options: unknown) => Promise<{ id: string }> } {
  return Boolean(channel && 'send' in channel);
}

function isSummaryCapableChannel(channel: unknown): channel is SummaryCapableChannel {
  return Boolean(
    channel &&
      typeof channel === 'object' &&
      'messages' in channel &&
      channel.messages &&
      typeof (channel as SummaryCapableChannel).messages.fetch === 'function',
  );
}

function getDisplayName(interaction: ChatInputCommandInteraction | Interaction): string {
  if ('member' in interaction && interaction.member && typeof interaction.member === 'object' && 'displayName' in interaction.member) {
    return String(interaction.member.displayName);
  }
  if ('user' in interaction) {
    return interaction.user.globalName || interaction.user.username;
  }
  return 'Crewmate';
}

async function replySafely(
  interaction: Interaction,
  response: { content: string; ephemeral?: boolean },
): Promise<void> {
  if (!interaction.isRepliable()) {
    return;
  }

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(response);
    return;
  }

  await interaction.reply(response);
}
