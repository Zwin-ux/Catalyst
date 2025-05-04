import { Client, Guild, GuildMember, Role, TextChannel, CommandInteraction, SlashCommandBuilder, Colors, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import pool from '../src/utils/db';

// --- Faction Slash Commands ---
export const factionCreateCmd = new SlashCommandBuilder()
  .setName('faction-create')
  .setDescription('Create a new faction and get a unique tag!')
  .addStringOption(opt => opt.setName('name').setDescription('Faction name').setRequired(true))
  .addStringOption(opt => opt.setName('emoji').setDescription('Faction emoji').setRequired(false))
  .addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g. #FF0000)').setRequired(false));

export const factionJoinCmd = new SlashCommandBuilder()
  .setName('faction-join')
  .setDescription('Join an existing faction!')
  .addStringOption(opt => opt.setName('name').setDescription('Faction name').setRequired(true));

export const factionLeaveCmd = new SlashCommandBuilder()
  .setName('faction-leave')
  .setDescription('Leave your current faction.');

// --- Faction Command Handlers ---
export async function handleFactionCreate(interaction: CommandInteraction, client: Client) {
  const name = interaction.options.get('name', true).value as string;
  const emoji = interaction.options.get('emoji')?.value as string | undefined;
  const color = interaction.options.get('color')?.value as string | undefined;
  const userId = interaction.user.id;
  const guild = interaction.guild as Guild;
  // Check if faction exists
  const { rows: existing } = await pool.query('SELECT * FROM factions WHERE name = $1', [name]);
  if (existing.length > 0) {
    await interaction.reply({ content: '❌ Faction already exists! Try a different name.', ephemeral: true });
    return;
  }
  // Creates role
  const role = await guild.roles.create({
    name: emoji ? `${emoji} ${name}` : name,
    color: color ? parseInt(color.replace('#', ''), 16) : Colors.Blurple,
    reason: `Faction created by ${interaction.user.tag}`
  });
  // Insert faction into DB
  const factionId = uuidv4();
  await pool.query('INSERT INTO factions (id, name, emoji, color, created_by) VALUES ($1, $2, $3, $4, $5)', [factionId, name, emoji, color, userId]);
  // Assign role to user
  const member = interaction.member as GuildMember;
  await member.roles.add(role);
  await pool.query('INSERT INTO user_factions (user_id, faction_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET faction_id = $2', [userId, factionId]);
  // Dramatic embed
  const embed = new EmbedBuilder()
    .setTitle(`🏟️ New Faction Rises!`)
    .setDescription(`${emoji || ''} **${name}** has entered the Coliseum!\n<@${userId}> is the founder.`)
    .setColor(color ? parseInt(color.replace('#', ''), 16) : Colors.Blurple)
    .addFields({ name: 'Tag', value: role.toString(), inline: true })
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
  // Announce in general channel if possible
  const announce = guild.channels.cache.find(c => c.name === 'general' && c.isTextBased()) as TextChannel;
  if (announce) {
    await announce.send({ embeds: [embed] });
  }
}

export async function handleFactionJoin(interaction: CommandInteraction, client: Client) {
  const name = interaction.options.get('name', true).value as string;
  const userId = interaction.user.id;
  const guild = interaction.guild as Guild;
  // Get faction info
  const { rows: factions } = await pool.query('SELECT * FROM factions WHERE name = $1', [name]);
  if (factions.length === 0) {
    await interaction.reply({ content: '❌ Faction not found.', ephemeral: true });
    return;
  }
  const faction = factions[0];
  // Find/create role
  let role = guild.roles.cache.find(r => r.name === (faction.emoji ? `${faction.emoji} ${faction.name}` : faction.name));
  if (!role) {
    role = await guild.roles.create({
      name: faction.emoji ? `${faction.emoji} ${faction.name}` : faction.name,
      color: faction.color || Colors.Blurple,
      reason: 'Faction role recreation'
    });
  }
  // Remove old faction roles
  const member = interaction.member as GuildMember;
  const factionRoles = guild.roles.cache.filter(r => r.name.includes('🏟️') || r.name.includes('Faction'));
  await member.roles.remove(factionRoles);
  // Assign new role
  await member.roles.add(role);
  await pool.query('INSERT INTO user_factions (user_id, faction_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET faction_id = $2', [userId, faction.id]);
  // Dramatic embed
  const embed = new EmbedBuilder()
    .setTitle(`⚔️ New Challenger Joins!`)
    .setDescription(`<@${userId}> has joined the **${faction.emoji || ''} ${faction.name}** faction!`)
    .setColor(faction.color || Colors.Blurple)
    .addFields({ name: 'Tag', value: role.toString(), inline: true })
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
  // Announce in general channel if possible
  const announce = guild.channels.cache.find(c => c.name === 'general' && c.isTextBased()) as TextChannel;
  if (announce) {
    await announce.send({ embeds: [embed] });
  }
}

export async function handleFactionLeave(interaction: CommandInteraction, client: Client) {
  const userId = interaction.user.id;
  const guild = interaction.guild as Guild;
  // Get current faction
  const { rows } = await pool.query('SELECT f.* FROM factions f JOIN user_factions uf ON f.id = uf.faction_id WHERE uf.user_id = $1', [userId]);
  if (rows.length === 0) {
    await interaction.reply({ content: '❌ You are not in a faction.', ephemeral: true });
    return;
  }
  const faction = rows[0];
  // Remove role
  const member = interaction.member as GuildMember;
  const role = guild.roles.cache.find(r => r.name === (faction.emoji ? `${faction.emoji} ${faction.name}` : faction.name));
  if (role) await member.roles.remove(role);
  await pool.query('DELETE FROM user_factions WHERE user_id = $1', [userId]);
  // Dramatic embed
  const embed = new EmbedBuilder()
    .setTitle(`🏳️ Faction Departure!`)
    .setDescription(`<@${userId}> has left the **${faction.emoji || ''} ${faction.name}** faction.`)
    .setColor('#555555')
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
  // Announce in general channel if possible
  const announce = guild.channels.cache.find(c => c.name === 'general' && c.isTextBased()) as TextChannel;
  if (announce) {
    await announce.send({ embeds: [embed] });
  }
}

// --- Button & Visual Utility Example ---
export function factionActionRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('faction-info')
      .setLabel('View Factions')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('faction-leave')
      .setLabel('Leave Faction')
      .setStyle(ButtonStyle.Danger)
  );
}
