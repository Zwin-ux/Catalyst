import { Client, GatewayIntentBits, Partials, TextChannel, GuildMember, Role, Interaction } from 'discord.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();
// Faction logic
import { factionCreateCmd, factionJoinCmd, factionLeaveCmd, handleFactionCreate, handleFactionJoin, handleFactionLeave, factionActionRow } from './faction';
import { logDramaAlliance, logDramaEvent } from './drama';
import { ButtonBuilder, ButtonStyle, ActionRowBuilder, Interaction } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.GuildMember],
});

// --- ENGINE CONFIGURATION ---
export type SovereignEngineConfig = {
  sovereignRoleName: string;
  announceChannel: string;
  pointsApi: string;
  sovereignPrompt: string;
  serverSize: 'small' | 'medium' | 'large';
  minCoupVotes: number;
  minEventVotes: number;
  schedulerInterval: number;
};

// Server size presets
export const ENGINE_PRESETS: Record<string, Partial<SovereignEngineConfig>> = {
  small: { serverSize: 'small', minCoupVotes: 3, minEventVotes: 3, schedulerInterval: 15 * 60 * 1000 },
  medium: { serverSize: 'medium', minCoupVotes: 10, minEventVotes: 10, schedulerInterval: 10 * 60 * 1000 },
  large: { serverSize: 'large', minCoupVotes: 50, minEventVotes: 50, schedulerInterval: 5 * 60 * 1000 },
};

export const DEFAULT_ENGINE_CONFIG: SovereignEngineConfig = {
  sovereignRoleName: process.env.SOVEREIGN_ROLE_NAME || 'Sovereign of the Realm',
  announceChannel: process.env.ANNOUNCE_CHANNEL || 'voice-notifs',
  pointsApi: process.env.POINTS_API_URL || 'http://localhost:3000',
  sovereignPrompt: process.env.SOVEREIGN_PROMPT || '👑 {user} is now Sovereign with {points} aura! All hail!',
  serverSize: 'medium',
  minCoupVotes: 10,
  minEventVotes: 10,
  schedulerInterval: 10 * 60 * 1000,
};

let ENGINE_CONFIG: SovereignEngineConfig = { ...DEFAULT_ENGINE_CONFIG, ...ENGINE_PRESETS[process.env.SERVER_SIZE || 'medium'] };

export function setEngineConfig(options: Partial<SovereignEngineConfig>) {
  ENGINE_CONFIG = { ...ENGINE_CONFIG, ...options };
}

// Util: Replace tokens in prompt
function formatSovereignPrompt(user: string, points: number) {
  return ENGINE_CONFIG.sovereignPrompt.replace('{user}', user).replace('{points}', points.toString());
}

client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = newState.id;
  const joined = !oldState.channel && newState.channel;
  const left = oldState.channel && !newState.channel;
  if (joined || left) {
 
  }
});

// --- Sovereign Engine Scheduler (Modular, Per-Server) ---
/**
 * Assigns the Sovereign role and announces the winner based on voice activity points.
 * All values are dynamically pulled from ENGINE_CONFIG for per-server customization.
 */
async function sovereignScheduler() {
  const now = new Date();
  const periodStart = new Date(now.getTime() - ENGINE_CONFIG.schedulerInterval); // Dynamic interval
  const res = await fetch(`${ENGINE_CONFIG.pointsApi}/points/sovereign?start=${periodStart.toISOString()}`);
  const data = await res.json();
  if (!data.sovereign) return;
  const guild = client.guilds.cache.first();
  if (!guild) return;
  const member = await guild.members.fetch(data.sovereign.userId).catch(() => undefined);
  if (!member) return;
  // Assign Sovereign role
  let sovereignRole = guild.roles.cache.find(r => r.name === ENGINE_CONFIG.sovereignRoleName);
  if (!sovereignRole) {
    sovereignRole = await guild.roles.create({ name: ENGINE_CONFIG.sovereignRoleName, color: 'GOLD', reason: 'Sovereign Engine event' });
  }
  await member.roles.add(sovereignRole);
  // Announce
  const channel = guild.channels.cache.find(c => c.name === ENGINE_CONFIG.announceChannel && c.isTextBased()) as TextChannel;
  if (channel) {
    await channel.send(formatSovereignPrompt(`<@${member.id}>`, data.sovereign.points));
  }
}

// Schedule using dynamic interval from ENGINE_CONFIG
setInterval(sovereignScheduler, ENGINE_CONFIG.schedulerInterval);

import { REST, Routes, SlashCommandBuilder, Interaction, TextChannel, Guild, Message, Channel } from 'discord.js';

// --- Dynamic Channel Utilities ---
export async function ensureEngineChannel(guild: Guild, name: string, topic: string): Promise<TextChannel> {
  let channel = guild.channels.cache.find((c: Channel) => (c instanceof TextChannel) && c.name === name) as TextChannel;
  if (!channel) channel = await guild.channels.create({ name, type: 0, topic }) as TextChannel;
  return channel;
}
export async function deleteEngineChannel(guild: Guild, name: string): Promise<void> {
  const channel = guild.channels.cache.find((c: Channel) => (c instanceof TextChannel) && c.name === name) as TextChannel;
  if (channel) await channel.delete();
}

// --- Emoji Reaction Voting Utility ---
export async function addEmojiVoting(channel: TextChannel, messageId: string, emojis: string[], onFinish: (results: Record<string, number>) => Promise<void>) {
  const message = await channel.messages.fetch(messageId);
  for (const emoji of emojis) await message.react(emoji);
  // Collect for 1 minute
  const filter = () => true;
  const collector = message.createReactionCollector({ filter, time: 60000 });
  collector.on('end', async collected => {
    const results: Record<string, number> = {};
    for (const emoji of emojis) {
      results[emoji] = collected.get(emoji)?.count || 0;
    }
    await onFinish(results);
  });
}


client.once('ready', async () => {
  console.log(`Bot ready as ${client.user?.tag}`);
  // --- ENGINE CHANNEL CONTROL CENTER ---
  const guild = client.guilds.cache.first();
  if (guild) {
    // Ensure all engine channels exist
    // Use simple, game-like names for UI channels
    const engineChannels = [
      { name: 'hub', topic: 'Game Hub & Tips' },
      { name: 'config', topic: 'Game Settings & Configuration' },
      { name: 'powers', topic: 'Available Powers & Features' },
      { name: 'mods', topic: 'Mods & Community Submissions' },
      { name: 'timeline', topic: 'Drama Timeline & Hall of Fame' }
    ];
    for (const { name, topic } of engineChannels) {
      let channel = guild.channels.cache.find(c => c.name === name && c.isTextBased());
      if (!channel) {
        channel = await guild.channels.create({ name, type: 0, topic });
      }
    }
    // Onboarding tips for new users
    const helpChannel = guild.channels.cache.find(c => c.name === 'engine-help' && c.isTextBased());
    if (helpChannel && 'send' in helpChannel) {
      await helpChannel.send({
        embeds: [{
          title: '👋 Welcome to the Game',
          description: `Compete for the ${ENGINE_CONFIG.sovereignRoleName} by earning drama points and engaging in events. Use buttons and emoji votes in the other channels to play! Settings and features are managed here—no slash commands needed.`,
          color: 0x00bfff,
          image: { url: 'https://cdn.pixabay.com/photo/2017/01/31/13/14/soap-bubble-2025834_1280.jpg' },
          footer: { text: 'Game Hub & Tips' },
          timestamp: new Date().toISOString()
        }]
      });
      await addEmojiVoting(hubChannel, msg.id, ['👍','❓'], async results => {
        await hubChannel.send({ content: `Hub votes: 👍 ${results['👍']} | ❓ ${results['❓']}` });
      });
    }
    // Post current powers/features in #powers
    const powersChannel = guild.channels.cache.find(c => c.name === 'powers' && c.isTextBased());
    if (powersChannel && 'send' in powersChannel) {
      const msg = await powersChannel.send({
        embeds: [{
          title: '⚡ Powers & Features',
          description: `- Duel (challenge another player)\n- Edict (make a server-wide announcement)\n- Grant Temp Role\n- Start Coup\n- Start Vote\n- Change Banner\n- Mod Manager (submit/vote on new features)`,
          color: 0xf8c300,
          image: { url: 'https://cdn.pixabay.com/photo/2016/03/31/19/14/crown-1294906_1280.png' },
          footer: { text: 'ENGINE | Powers & Features' },
          timestamp: new Date().toISOString()
        }]
      });
    }
    // Post mods info in #mods
    const modsChannel = guild.channels.cache.find(c => c.name === 'mods' && c.isTextBased());
    if (modsChannel && 'send' in modsChannel) {
      const msg = await modsChannel.send({
        embeds: [{
          title: '🧩 Mods & Community Submissions',
          description: 'Propose and vote on new drama events, minigames, and analytics mods! Upload/enable coming soon.',
          color: 0x9b59b6,
          image: { url: 'https://cdn.pixabay.com/photo/2017/01/31/13/14/soap-bubble-2025834_1280.jpg' },
          footer: { text: 'Mods' },
          timestamp: new Date().toISOString()
        }]
      });
      await addEmojiVoting(modsChannel, msg.id, ['👍','👎'], async results => {
        await modsChannel.send({ content: `Mods votes: 👍 ${results['👍']} | 👎 ${results['👎']}` });
      });
    }
    // Post timeline in #timeline
    const timelineChannel = guild.channels.cache.find(c => c.name === 'timeline' && c.isTextBased());
    if (timelineChannel && 'send' in timelineChannel) {
      const msg = await timelineChannel.send({
        embeds: [{
          title: '🏆 Hall of Fame & Drama Timeline',
          description: 'See the most dramatic moments, top Sovereigns, and legendary coups here! (Timeline coming soon)',
          color: 0xff8800,
          image: { url: 'https://cdn.pixabay.com/photo/2016/03/31/19/14/crown-1294906_1280.png' },
          footer: { text: 'ENGINE | Hall of Fame' },
          timestamp: new Date().toISOString()
        }]
      });
    }
  }
  // Run scheduler
  sovereignScheduler();
});

// All help/setup/powers/plugins/timeline are handled via engine-* channels and buttons. No slash commands needed.
// (Legacy /setup handler removed)


import { handleMessage } from './moderation';

client.on('messageCreate', async (message) => {
  await handleMessage(client, message);
  // --- DRAMA AUTO-DETECTION ---
  // Ignore bots
  if (message.author.bot) return;
  // Drama spike detection: high message rate, mentions, or negative sentiment
  const dramaScore = await autoDetectDrama(message);
  if (dramaScore > 5) {
    await autoTriggerDramaEvent(client, message, dramaScore);
  }
  // Faction suggestion: users frequently interacting or supporting each other
  await autoSuggestFaction(client, message);
});

// --- Auto-Betrayals & Faction Dissolutions ---
import pool from '../src/utils/db';
import { EmbedBuilder } from 'discord.js';

setInterval(async () => {
  // Check for betrayals/dissolutions every 10 minutes
  const { rows: alliances } = await pool.query('SELECT * FROM drama_alliances');
  for (const row of alliances) {
    const inactive = (Date.now() - new Date(row.last_interaction).getTime()) > 7 * 24 * 60 * 60 * 1000;
    const negative = row.drama_score < -5;
    if ((row.type === 'alliance' && negative) || inactive) {
      // Betrayal/dissolution event
      const guilds = Array.from(client.guilds.cache.values());
      for (const guild of guilds) {
        const channel = guild.channels.cache.find(c => c.name === 'general' && c.isTextBased());
        if (channel && 'send' in channel) {
          const embed = new EmbedBuilder()
            .setTitle('💔 Betrayal or Dissolution!')
            .setDescription(`<@${row.user_a}> and <@${row.user_b}> have parted ways. The alliance has ended!`)
            .setColor(0x990000)
            .setImage('https://cdn.pixabay.com/photo/2016/04/01/09/27/broken-heart-1294474_1280.png')
            .setTimestamp();
          await channel.send({ embeds: [embed] });
        }
      }
      await pool.query('DELETE FROM drama_alliances WHERE id = $1', [row.id]);
    }
  }
}, 10 * 60 * 1000); // every 10 minutes


// --- Auto Faction War Trigger ---
async function autoCheckFactionWar(client: import('discord.js').Client, userA: string, userB: string) {
  // TODO: Query DB for their factions, if different and drama is high, auto-initiate war
  // For now, simulate with random chance
  if (Math.random() < 0.2) {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    const channel = guild.channels.cache.find(c => c.name === 'general' && c.isTextBased());
    if (channel && 'send' in channel) {
      await channel.send({
        embeds: [{
          title: '⚔️ Faction War Ignites!',
          description: 'Two rival factions are clashing in the Coliseum! Who will emerge victorious?',
          color: 0x9900ff,
          footer: { text: 'Automated event | Drama at its peak!' }
        }]
      });
    }
  }
}

// --- Automated Leaderboard Announcement & Player-Run Takeover ---
async function autoAnnounceLeaderboard(guild: import('discord.js').Guild) {
  // Query leaderboard, show top drama-makers
  const { rows: leaders } = await pool.query(`
    SELECT user_a as user_id, SUM(score) as total_points
    FROM drama_events
    WHERE user_a IS NOT NULL
    GROUP BY user_a
    ORDER BY total_points DESC
    LIMIT 1
  `);
  const topUser = leaders[0]?.user_id;
  const topPoints = leaders[0]?.total_points;
  const channel = guild.channels.cache.find(c => c.name === 'general' && c.isTextBased());
  if (channel && 'send' in channel) {
    let description = 'Who is ruling the drama this week? (Automated update)';
    if (topUser) {
      description = `<@${topUser}> is the current ${ENGINE_CONFIG.sovereignRoleName} with ${topPoints} points!\nReact below to let them claim the ${ENGINE_CONFIG.sovereignRoleName} role.`;
      await channel.send({
        embeds: [{
          title: `👑 ${ENGINE_CONFIG.sovereignRoleName} Candidate`,
          description,
          color: 0xffcc00,
          footer: { text: 'ENGINE | Automated Spectacle' },
          image: { url: 'https://cdn.pixabay.com/photo/2016/03/31/19/14/crown-1294906_1280.png' },
          timestamp: new Date().toISOString()
        }],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`engine_takeover_${topUser}`).setLabel(`Claim ${ENGINE_CONFIG.sovereignRoleName}`).setStyle(ButtonStyle.Primary)
          )
        ]
      });
    } else {
      await channel.send({
        embeds: [{
          title: '🏆 Drama Leaderboard',
          description,
          color: 0xffcc00,
          footer: { text: 'Coliseum Bot | Automated Spectacle' }
        }]
      });
    }
  }

// --- Handle Takeover Button & King's Decree ---
client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isButton()) return;
  // --- Sovereign Takeover Button ---
  if (interaction.customId.startsWith('engine_takeover_')) {
    const userId = interaction.customId.split('_')[2];
    const guild = interaction.guild;
    if (!guild) return;
    let sovereignRole = guild.roles.cache.find((r: Role) => r.name === ENGINE_CONFIG.sovereignRoleName);
    if (!sovereignRole) {
      sovereignRole = await guild.roles.create({
        name: ENGINE_CONFIG.sovereignRoleName,
        color: '#FFD700',
        reason: 'ENGINE: Sovereign role auto-created'
      });
    }
    // Remove Sovereign role from all others & DM dethronement
    for (const member of sovereignRole.members.values()) {
      await member.roles.remove(sovereignRole);
      try {
        await member.send({
          embeds: [{
            title: '💔 You Have Been Dethroned',
            description: `Your reign as ${ENGINE_CONFIG.sovereignRoleName} has ended. The crown has passed to another!`,
            color: 0x990000,
            image: { url: 'https://cdn.pixabay.com/photo/2016/04/01/09/27/broken-heart-1294474_1280.png' },
            footer: { text: 'ENGINE | Dethronement' },
            timestamp: new Date().toISOString()
          }]
        });
      } catch {}
    }
    // Assign Sovereign role to new user
    const member = await guild.members.fetch(userId);
    await member.roles.add(sovereignRole);
    try {
      await member.send({
        embeds: [{
          title: `👑 You Are Now ${ENGINE_CONFIG.sovereignRoleName}!`,
          description: `You have seized the crown and now rule as ${ENGINE_CONFIG.sovereignRoleName}. Use your power wisely!`,
          color: 0xffd700,
          image: { url: 'https://cdn.pixabay.com/photo/2016/03/31/19/14/crown-1294906_1280.png' },
          footer: { text: `ENGINE | ${ENGINE_CONFIG.sovereignRoleName}` },
          timestamp: new Date().toISOString()
        }],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('engine_edict').setLabel('Edict').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('engine_duel').setLabel('Duel').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('engine_banner').setLabel('Change Banner').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('engine_temp_role').setLabel('Grant Temp Role').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('engine_coup').setLabel('Start Coup').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('engine_vote').setLabel('Start Vote').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('engine_plugin_mgr').setLabel('Plugin Manager').setStyle(ButtonStyle.Success)
          )
        ]
      });
      // Announce in Hall of Fame
      const fameChannel = guild.channels.cache.find((c: any) => c.name === 'engine-hall-of-fame' && c.isTextBased());
      if (fameChannel && 'send' in fameChannel) {
        await fameChannel.send({
          embeds: [{
            title: `👑 New ${ENGINE_CONFIG.sovereignRoleName} Crowned!`,
            description: `<@${userId}> is now the ${ENGINE_CONFIG.sovereignRoleName}! All hail the new ruler!`,
            color: 0xffd700,
            image: { url: 'https://cdn.pixabay.com/photo/2016/03/31/19/14/crown-1294906_1280.png' },
            footer: { text: 'ENGINE | Hall of Fame' },
            timestamp: new Date().toISOString()
          }]
        });
      }
    } catch {}
    await interaction.reply({ content: 'You have claimed the Sovereign role!', ephemeral: true });
  }

  // --- Engine Coup Vote Handler (Automated, Modular) ---
  if (interaction.customId === 'engine_coup_yes' || interaction.customId === 'engine_coup_no') {
    if (!globalThis.engineCoupVotes) globalThis.engineCoupVotes = { yes: 0, no: 0, voters: new Set() };
    if (globalThis.engineCoupVotes.voters.has(interaction.user.id)) {
      await interaction.reply({ content: 'You have already voted in this coup!', ephemeral: true });
      return;
    }
    if (interaction.customId === 'engine_coup_yes') globalThis.engineCoupVotes.yes++;
    else globalThis.engineCoupVotes.no++;
    globalThis.engineCoupVotes.voters.add(interaction.user.id);
    // Edge case: not enough votes
    const totalVotes = globalThis.engineCoupVotes.yes + globalThis.engineCoupVotes.no;
    if (totalVotes < ENGINE_CONFIG.minCoupVotes) {
      const fameChannel = interaction.guild?.channels.cache.find((c: any) => c.name === 'engine-hall-of-fame' && c.isTextBased());
      if (fameChannel && 'send' in fameChannel) {
        await fameChannel.send({
    // Modular: Show drama stats, history, leaderboards, etc.
    await interaction.reply({ content: 'Analytics and drama history coming soon! (Will be modular and extensible)', ephemeral: true });
    return;
  }
    } catch {}
    await interaction.reply({
      content: `👑 <@${userId}> is now the King of the House! All hail the new ruler!`,
      ephemeral: false
    });
    // Dramatic announcement
    const channel = guild.channels.cache.find(c => c.name === 'general' && c.isTextBased());
    if (channel && 'send' in channel) {
      await channel.send({
        embeds: [
          {
            title: dethroned ? '👑 The King Has Been Dethroned!' : '👑 The Discord Has Been Taken Over!',
            description: dethroned
              ? `<@${dethroned.id}> has been dethroned. <@${userId}> now rules the server as King!`
              : `<@${userId}> has seized the crown and now rules the server as King!`,
            color: dethroned ? 0xff3333 : 0xffd700,
            image: { url: dethroned ? 'https://cdn.pixabay.com/photo/2016/04/01/09/27/broken-heart-1294474_1280.png' : 'https://cdn.pixabay.com/photo/2016/03/31/19/14/crown-1294906_1280.png' },
            footer: { text: 'Player-Run Discord | King of the House' },
            timestamp: new Date().toISOString()
          }
        ],
  }
  // King's Decree: Only allow current King to use
  if (interaction.customId === 'kings_decree') {
    const guild = interaction.guild;
    if (!guild) return;
{{ ... }}
    let kingRole = guild.roles.cache.find(r => r.name === 'King of the House');
    if (!kingRole) return;
    const member = await guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(kingRole.id)) {
      await interaction.reply({ content: 'Only the King can issue a decree!', ephemeral: true });
      return;
    }
    // Dramatic decree modal
    await interaction.reply({
      content: 'What is your decree, Your Majesty? (Type it in the chat and begin with: !decree )',
      ephemeral: true
    });
    // Next message from King with !decree will be broadcast
    const filter = (m: any) => m.author.id === interaction.user.id && m.content.startsWith('!decree');
    const channel = guild.channels.cache.find(c => c.name === 'general' && c.isTextBased());
    if (channel && 'send' in channel) {
      const collector = channel.createMessageCollector({ filter, max: 1, time: 60000 });
      collector.on('collect', async (m: any) => {
        await channel.send({
          embeds: [
            {
              title: '📜 King\'s Decree',
              description: m.content.replace('!decree', '').trim(),
              color: 0xffd700,
              image: { url: 'https://cdn.pixabay.com/photo/2016/03/31/19/14/crown-1294906_1280.png' },
              footer: { text: `Issued by ${m.author.tag}` },
              timestamp: new Date().toISOString()
            }
          ]
        });
      });
    }
  }
});

// --- King of the House Poll Scheduler ---
let lastKingPoll = 0;
setInterval(async () => {
  // Only run poll if drama has occurred in the last 20 minutes
  const now = Date.now();
  if (now - lastKingPoll < 20 * 60 * 1000) return;
  // Query recent drama events
  const { rows: events } = await pool.query("SELECT * FROM drama_events WHERE event_type = 'duel' AND event_time > NOW() - INTERVAL '20 minutes'");
  if (events.length > 0) {
    lastKingPoll = now;
    const guilds = Array.from(client.guilds.cache.values());
    for (const guild of guilds) {
      const channel = guild.channels.cache.find(c => c.name === 'general' && c.isTextBased());
      if (channel && 'send' in channel) {
        await channel.send({
          embeds: [{
            title: '👑 Who is the King of the House?',
            description: 'Vote now for the most dramatic, persuasive, or entertaining member! React with 👑 to cast your vote.',
            color: 0xffcc00,
            image: { url: 'https://cdn.pixabay.com/photo/2016/03/31/19/14/crown-1294906_1280.png' },
            footer: { text: 'Coliseum Bot | King of the House Poll' },
            timestamp: new Date().toISOString()
          }]
        });
      }
    }
  }
}, 60 * 1000); // check every minute

// --- Automation Hooks ---
async function autoDetectDrama(message: import('discord.js').Message): Promise<number> {
  let score = 0;
  if ((message.mentions.users.size + message.mentions.roles.size) > 1) score += 2;
  if (message.content === message.content.toUpperCase() && message.content.length > 10) score += 2;
  const dramaWords = ['fight', 'vs', 'drama', 'beef', 'war', 'callout', 'battle'];
  if (dramaWords.some(w => message.content.toLowerCase().includes(w))) score += 2;
  // Sentiment/toxicity API integration
  try {
    const resp = await fetch(process.env.TOXICITY_API_URL!, {
      method: 'POST',
      body: JSON.stringify({ text: message.content }),
      headers: { 'Content-Type': 'application/json' }
    });
    const { toxic, score: toxicityScore } = await resp.json();
    if (toxic) score += Math.ceil(toxicityScore * 5); // Weight highly
  } catch (e) { /* ignore if API fails */ }
  return score;
}

// --- Persistent Drama Tracking ---
const dramaTracker: Record<string, { mentions: Record<string, number>, dramaPoints: number }> = {};

async function autoTriggerDramaEvent(client: import('discord.js').Client, message: import('discord.js').Message, score: number) {
  // If drama detected, auto-initiate a "Duel" event between top participants
  const guild = message.guild;
  if (!guild) return;
  // Track drama participation
  const authorId = message.author.id;
  if (!dramaTracker[authorId]) dramaTracker[authorId] = { mentions: {}, dramaPoints: 0 };
  dramaTracker[authorId].dramaPoints += score;
  message.mentions.users.forEach(u => {
    if (!dramaTracker[authorId].mentions[u.id]) dramaTracker[authorId].mentions[u.id] = 0;
    dramaTracker[authorId].mentions[u.id]++;
    // Persist rivalry to DB
    logDramaAlliance(authorId, u.id, 'rivalry', score).catch(() => {});
  });
  // Find top two drama rivals (author and most mentioned)
  const mentioned = message.mentions.users.first();
  if (!mentioned) return;
  // Announce duel with enhanced embed and interactive voting buttons
  const channel = message.channel;
  const duelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vote_${authorId}`).setLabel('Vote Challenger').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`vote_${mentioned.id}`).setLabel('Vote Rival').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('cheer').setLabel('Cheer!').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('boo').setLabel('Boo!').setStyle(ButtonStyle.Secondary)
  );
  await channel.send({
    embeds: [{
      title: '⚡ Drama Duel Begins!',
      description: `A heated argument has erupted between <@${authorId}> and <@${mentioned.id}>! \nWho will win the Coliseum's favor?`,
      color: 0xff0000,
      timestamp: new Date().toISOString(),
      thumbnail: { url: message.author.displayAvatarURL() },
      fields: [
        { name: '🔥 Challenger', value: `<@${authorId}>`, inline: true },
        { name: '💀 Rival', value: `<@${mentioned.id}>`, inline: true },
      ],
      footer: { text: 'Vote below | Drama points awarded!' }
    }],
    components: [duelRow]
  });
  await logDramaEvent('duel', authorId, mentioned.id, null, null, score, { messageId: message.id });
  // Auto-initiate faction war if drama between two factions is high
  await autoCheckFactionWar(client, authorId, mentioned.id);
  // Auto-announce leaderboard if drama points pass threshold
  if (dramaTracker[authorId].dramaPoints > 20) {
    await autoAnnounceLeaderboard(channel.guild);
    dramaTracker[authorId].dramaPoints = 0;
  }
  // Random drama night trigger
  if (Math.random() < 0.05) {
    await channel.send({
      embeds: [{
        title: '🌙 Random Drama Night!',
        description: 'The Coliseum is ablaze! All drama points are doubled for the next hour!',
        color: 0x3333ff,
        footer: { text: 'Automated event | Drama escalates!' }
      }]
    });
    await logDramaEvent('random_drama_night', authorId, null, null, null, 0, {});
  }
}

async function autoSuggestFaction(client: import('discord.js').Client, message: import('discord.js').Message) {
  // Persistent tracking: increment mention pairs
  const authorId = message.author.id;
  if (!dramaTracker[authorId]) dramaTracker[authorId] = { mentions: {}, dramaPoints: 0 };
  message.mentions.users.forEach(u => {
    if (!dramaTracker[authorId].mentions[u.id]) dramaTracker[authorId].mentions[u.id] = 0;
    dramaTracker[authorId].mentions[u.id]++;
    // Suggest faction if mentioned 3+ times
    if (dramaTracker[authorId].mentions[u.id] === 3) {
      const ch = message.channel;
      const allianceRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`faction_create_${authorId}_${u.id}`).setLabel('Form Faction').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cheer_alliance').setLabel('Cheer!').setStyle(ButtonStyle.Primary)
      );
      ch.send({
        embeds: [{
          title: '🤝 Alliance Detected!',
          description: `<@${authorId}> and <@${u.id}> keep teaming up! Should they form a faction?`,
          color: 0x00ff99,
          footer: { text: 'Click below to create a faction instantly!' }
        }],
        components: [allianceRow]
      });
      logDramaAlliance(authorId, u.id, 'alliance', 1).catch(() => {});
      logDramaEvent('alliance_suggestion', authorId, u.id, null, null, 1, {});
    }
  });
}
  // If two users frequently interact, suggest a faction
  // (Stub: could track message pairs, mutual reactions, or alliances)
  // For now, if user mentions another user 3+ times in a session, suggest faction
  // TODO: Implement persistent tracking
}


// Admin moderation slash commands
const modSetupCmd = new SlashCommandBuilder().setName('modsetup').setDescription('Configure moderation settings');
const modLogCmd = new SlashCommandBuilder().setName('modlog').setDescription('View recent moderation actions');
const modRewardCmd = new SlashCommandBuilder().setName('modreward').setDescription('Review and grant moderator rewards');
const modConfigCmd = new SlashCommandBuilder().setName('modconfig').setDescription('Configure AI toxicity, spam filters, and escalation');

client.once('ready', async () => {
  // ...existing code...
  await rest.put(Routes.applicationCommands(client.user!.id), { body: [setupCmd.toJSON(), modSetupCmd.toJSON(), modLogCmd.toJSON(), modRewardCmd.toJSON(), modConfigCmd.toJSON()] });
  kingScheduler();
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;
  // Faction commands
  if (interaction.commandName === 'faction-create') {
    await handleFactionCreate(interaction, client);
    return;
  }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
