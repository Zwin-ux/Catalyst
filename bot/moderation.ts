import { Client, Message, TextChannel, GuildMember } from 'discord.js';
import fetch from 'node-fetch';

export interface ModAction {
  userId: string;
  action: 'warn' | 'mute' | 'kick' | 'ban' | 'delete';
  reason: string;
  timestamp: Date;
  moderatorId: string;
}

const spamTracker: Record<string, { count: number; lastMessage: number; lastContent: string }> = {};
const TOXICITY_API = process.env.TOXICITY_API_URL;
const MODLOG_CHANNEL = process.env.MODLOG_CHANNEL || 'modlog';

export async function handleMessage(client: Client, message: Message) {
  if (message.author.bot) return;
  // Anti-spam
  const now = Date.now();
  const userId = message.author.id;
  if (!spamTracker[userId]) spamTracker[userId] = { count: 0, lastMessage: 0, lastContent: '' };
  const tracker = spamTracker[userId];
  if (now - tracker.lastMessage < 4000 || message.content === tracker.lastContent) {
    tracker.count++;
    if (tracker.count >= 4) {
      await escalate(client, message, 'spam');
      tracker.count = 0;
    }
  } else {
    tracker.count = 1;
  }
  tracker.lastMessage = now;
  tracker.lastContent = message.content;
  // Anti-toxicity (stub for AI integration)
  if (TOXICITY_API) {
    const resp = await fetch(TOXICITY_API, { method: 'POST', body: JSON.stringify({ text: message.content }), headers: { 'Content-Type': 'application/json' } });
    const { toxic } = await resp.json();
    if (toxic) {
      await escalate(client, message, 'toxicity');
    }
  }
}

async function escalate(client: Client, message: Message, reason: string) {
  const member = message.member as GuildMember;
  // Escalation: warn, then mute
  await message.reply(`⚠️ You have been warned for ${reason}. Further violations may result in a mute.`);
  logModAction(client, {
    userId: member.id,
    action: 'warn',
    reason,
    timestamp: new Date(),
    moderatorId: client.user!.id
  }, message.guild?.id);
  // TODO: escalate to mute/kick/ban for repeat offenders
}

export async function logModAction(client: Client, action: ModAction, guildId?: string) {
  const guild = client.guilds.cache.get(guildId!);
  if (!guild) return;
  const channel = guild.channels.cache.find(c => c.name === MODLOG_CHANNEL && c.isTextBased()) as TextChannel;
  if (channel) {
    await channel.send(`[${action.timestamp.toISOString()}] ${action.action.toUpperCase()} | <@${action.userId}> | ${action.reason} | by <@${action.moderatorId}>`);
  }
}
