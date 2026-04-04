import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

import type {
  CatalystModule,
  GuildOverview,
  JoinSeasonResult,
  LeaderboardEntry,
  MemberProfile,
  Season,
  SeasonEvent,
} from '../catalyst';
import type { RitualPrompt } from './rituals';
import type { ChannelSummary } from './summaries';

const CONSOLE = {
  ink: 0x68d5ff,
  relay: 0x84a7ff,
  ember: 0xff8b67,
};

function progressBar(value: number, maxValue: number): string {
  const safeMax = Math.max(maxValue, 1);
  const filled = value <= 0 ? 0 : Math.max(1, Math.round((value / safeMax) * 8));
  return `[${'#'.repeat(filled)}${'-'.repeat(8 - filled)}]`;
}

function formatCrewLines(season: Season): string {
  const maxPoints = Math.max(...season.crews.map((entry) => entry.points), 1);

  return season.crews
    .map(
      (crew) =>
        `\`${crew.name.padEnd(6, ' ')}\` ${progressBar(crew.points, maxPoints)} ${crew.points} pts`,
    )
    .join('\n');
}

export function buildSetupEmbed(overview: GuildOverview): EmbedBuilder {
  const install = overview.installation;
  const seasonLine = overview.activeSeason
    ? `${overview.activeSeason.name} is already active.`
    : 'No active season yet.';

  return new EmbedBuilder()
    .setColor(CONSOLE.ink)
    .setTitle('Catalyst control room is ready')
    .setDescription(
      'One board. A clean consent layer. Daily prompts and sharp recaps when you want them.\n\nThis server now has the hosted Catalyst control layer configured.',
    )
    .addFields(
      {
        name: 'Theme',
        value: `\`${install.theme}\``,
        inline: true,
      },
      {
        name: 'Quiet Hours',
        value: `\`${install.quietHours}\``,
        inline: true,
      },
      {
        name: 'Announce Channel',
        value: install.announceChannelId ? `<#${install.announceChannelId}>` : 'Not set',
        inline: true,
      },
      {
        name: 'Consent Copy',
        value: install.consentCopy,
      },
      {
        name: 'Status',
        value: `${seasonLine}\nUse \`/season start\` to launch the board or \`/ritual prompt\` when the room needs a reset.`,
      },
    )
    .setFooter({
      text: 'Duolingo-quality clarity, black-slug control-deck skin.',
    });
}

export function buildSeasonAnnouncementEmbed(
  overview: GuildOverview,
  consentCopy: string,
): EmbedBuilder {
  const season = overview.activeSeason;
  if (!season) {
    throw new Error('No active season to announce.');
  }

  return new EmbedBuilder()
    .setColor(CONSOLE.relay)
    .setTitle(`${season.name} is live`)
    .setDescription(
      'Opt in once. Get assigned to a crew. Leave any time with `/optout`.\n\nThe room is built for visible momentum: prompts, boards, highlights, and recaps.',
    )
    .addFields(
      {
        name: 'How It Works',
        value:
          '1. Hit **Join Season**\n2. Catalyst assigns your crew\n3. Use `/ritual prompt` and `/summary channel` to keep the room moving',
      },
      {
        name: 'Crews',
        value: formatCrewLines(season),
      },
      {
        name: 'Consent',
        value: consentCopy,
      },
    )
    .setFooter({
      text: `${overview.activeMembers} active members so far`,
    });
}

export function buildSeasonAnnouncementActions(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('catalyst:join')
      .setLabel('Join Season')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('catalyst:leaderboard')
      .setLabel('View Board')
      .setStyle(ButtonStyle.Secondary),
  );
}

export function buildJoinResultEmbed(result: JoinSeasonResult): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(result.crew.color)
    .setTitle(`You're in ${result.crew.name}`)
    .setDescription(
      `${result.membership.displayName}, your season is live.\n\nYou earned **${result.membership.score} warm-up points** for joining and now have your first streak tick.`,
    )
    .addFields(
      {
        name: 'Crew Brief',
        value: result.crew.description,
      },
      {
        name: 'What Unlocks Next',
        value:
          'Watch for the next ritual prompt, spotlight, board refresh, and crew recap.\nYou can leave anytime with `/optout`.',
      },
    )
    .setFooter({
      text: `${result.season.name} - ${result.season.crews.length} crews active`,
    });
}

export function buildLeaderboardEmbed(
  season: Season,
  leaderboard: LeaderboardEntry[],
  events: SeasonEvent[],
): EmbedBuilder {
  const board = leaderboard
    .map(
      (entry, index) =>
        `${index + 1}. ${entry.crewName.padEnd(6, ' ')} ${entry.points} pts - ${entry.memberCount} members`,
    )
    .join('\n');

  const eventsText =
    events.length > 0
      ? events.map((event) => `- ${event.summary}`).join('\n')
      : 'No season events yet.';

  return new EmbedBuilder()
    .setColor(CONSOLE.ink)
    .setTitle(`${season.name} board`)
    .setDescription('Clear score, clear next step, zero clutter.')
    .addFields(
      {
        name: 'Standings',
        value: `\`\`\`\n${board}\n\`\`\``,
      },
      {
        name: 'Recent Moves',
        value: eventsText,
      },
    );
}

export function buildProfileEmbed(profile: MemberProfile): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(profile.crew.color)
    .setTitle(`${profile.membership.displayName}'s profile`)
    .setDescription(
      `You're active in **${profile.season.name}** with **${profile.crew.name}**.`,
    )
    .addFields(
      {
        name: 'Score',
        value: `\`${profile.membership.score} pts\``,
        inline: true,
      },
      {
        name: 'Streak',
        value: `\`${profile.membership.streak} week\``,
        inline: true,
      },
      {
        name: 'Crew',
        value: `${profile.crew.name}\n${profile.crew.description}`,
        inline: true,
      },
    )
    .setFooter({
      text: 'Use /leaderboard to check the full board.',
    });
}

export function buildSeasonSummaryEmbed(season: Season): EmbedBuilder {
  const winner = [...season.crews].sort((left, right) => right.points - left.points)[0];

  return new EmbedBuilder()
    .setColor(winner?.color || CONSOLE.ember)
    .setTitle(`${season.name} complete`)
    .setDescription(
      winner
        ? `${winner.name} closed the season on top with ${winner.points} points.`
        : 'This season is complete.',
    )
    .addFields({
      name: 'Final Board',
      value: formatCrewLines(season),
    });
}

export function buildChannelSummaryEmbed(summary: ChannelSummary): EmbedBuilder {
  const participantLine =
    summary.topParticipants.length > 0
      ? summary.topParticipants
          .map((participant: { name: string; count: number }) => `${participant.name} (${participant.count})`)
          .join(', ')
      : 'No active speakers in this slice.';

  return new EmbedBuilder()
    .setColor(CONSOLE.ink)
    .setTitle(summary.title)
    .setDescription(
      `${summary.totalMessages} messages - ${summary.participantCount} participants\nFast read, clear themes, next actions visible.`,
    )
    .addFields(
      {
        name: 'Who Drove It',
        value: participantLine,
      },
      {
        name: 'Themes',
        value:
          summary.themes.length > 0
            ? summary.themes.map((theme: string) => `\`${theme}\``).join(' ')
            : 'No obvious theme cluster.',
      },
      {
        name: 'Highlights',
        value: summary.highlights.map((highlight: string) => `- ${highlight}`).join('\n'),
      },
      {
        name: 'Action Items',
        value: summary.actionItems.map((item: string) => `- ${item}`).join('\n'),
      },
    )
    .setFooter({
      text: 'Built from explicit command access to channel history, not hidden ambient scraping.',
    });
}

export function buildRitualPromptEmbed(prompt: RitualPrompt): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(CONSOLE.relay)
    .setTitle(prompt.title)
    .setDescription(prompt.prompt)
    .addFields(
      {
        name: 'Host Note',
        value: prompt.hostLine,
      },
      {
        name: 'Follow Through',
        value: prompt.followThrough,
      },
      {
        name: 'Why This Works',
        value: prompt.whyItWorks,
      },
    )
    .setFooter({
      text: 'Question Loop module - one sharp prompt beats ten weak nudges.',
    });
}

export function buildModuleCatalogEmbed(modules: CatalystModule[]): EmbedBuilder {
  const lines = modules
    .map(
      (module) =>
        `**${module.name}** [${module.status}] - ${module.cadence}\n${module.description}\nHooks: \`${module.hooks.join('`, `')}\``,
    )
    .join('\n\n');

  return new EmbedBuilder()
    .setColor(CONSOLE.ink)
    .setTitle('Catalyst module rack')
    .setDescription(
      'Catalyst is shaping into a Discord-native engine: a small set of live modules now, stable plugin slots next.',
    )
    .addFields({
      name: 'Live + Next',
      value: lines,
    })
    .setFooter({
      text: 'Use /ritual prompt to fire the Question Loop module now.',
    });
}
