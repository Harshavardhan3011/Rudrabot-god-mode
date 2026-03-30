/**
 * Command Executor - Safe whitelist-based command preset runner
 * Owner only
 * Executes pre-approved command sequences
 * No raw code execution - only Discord.js API methods
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';

interface CommandPreset {
  id: string;
  name: string;
  description: string;
  actions: string[]; // Descriptions of actions to perform
}

// Whitelist of safe presets only
const SAFE_PRESETS: Record<string, CommandPreset> = {
  'list-roles': {
    id: 'list-roles',
    name: 'List All Roles',
    description: 'Display all roles in the server with member counts',
    actions: [
      'Fetch all roles',
      'Count members per role',
      'Display in formatted list',
    ],
  },
  'list-channels': {
    id: 'list-channels',
    name: 'List All Channels',
    description: 'Display all channels organized by category',
    actions: [
      'Fetch all channels',
      'Organize by category',
      'Display in formatted list',
    ],
  },
  'count-members': {
    id: 'count-members',
    name: 'Count Members',
    description: 'Get detailed server member statistics',
    actions: [
      'Fetch all members',
      'Count by status (online/offline)',
      'Count bot vs human',
      'Display statistics',
    ],
  },
  'ban-list': {
    id: 'ban-list',
    name: 'View Ban List',
    description: 'Display all banned users',
    actions: ['Fetch audit logs for bans', 'Display banned user list'],
  },
};

export const data = new SlashCommandBuilder()
  .setName('command-executor')
  .setDescription('Execute safe pre-approved command presets')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt =>
    opt
      .setName('preset')
      .setDescription('Pre-approved command preset')
      .setRequired(true)
      .addChoices(
        { name: 'List Roles', value: 'list-roles' },
        { name: 'List Channels', value: 'list-channels' },
        { name: 'Count Members', value: 'count-members' },
        { name: 'View Ban List', value: 'ban-list' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Authorization check - Owner only
    if (!permissionValidator.isOwner(interaction.user.id)) {
      const denyEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Owner Only')
        .setDescription('This command is restricted to server owners.');

      await interaction.reply({
        embeds: [denyEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'command-executor',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Non-owner attempt',
      });

      return;
    }

    const presetId = interaction.options.getString('preset', true);
    const preset = SAFE_PRESETS[presetId];

    if (!preset) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Unknown preset')
        .setDescription(`Preset \`${presetId}\` not found.`);

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      throw new Error('Guild not found');
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      if (presetId === 'list-roles') {
        await executeListRoles(interaction, guild);
      } else if (presetId === 'list-channels') {
        await executeListChannels(interaction, guild);
      } else if (presetId === 'count-members') {
        await executeCountMembers(interaction, guild);
      } else if (presetId === 'ban-list') {
        await executeBanList(interaction, guild);
      }

      auditLogger.log({
        action: 'command-executor',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: guild.id,
        guildName: guild.name,
        details: { preset: presetId },
        success: true,
      });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Execution failed')
        .setDescription(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

      await interaction.editReply({
        embeds: [errorEmbed],
      });

      auditLogger.log({
        action: 'command-executor',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: guild.id,
        guildName: guild.name,
        details: { preset: presetId },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } catch (error) {
    console.error('❌ /command-executor error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}

async function executeListRoles(
  interaction: ChatInputCommandInteraction,
  guild: any
): Promise<void> {
  await guild.roles.fetch();
  const roles = guild.roles.cache
    .filter((r: any) => r.id !== guild.id) // Exclude @everyone
    .sort((a: any, b: any) => b.position - a.position)
    .map((r: any) => `• **${r.name}** (${r.members.size} members) — <@&${r.id}>`)
    .slice(0, 50);

  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle(`📋 Server Roles (${guild.roles.cache.size})`)
    .setDescription(roles.join('\n') || 'No roles found')
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function executeListChannels(
  interaction: ChatInputCommandInteraction,
  guild: any
): Promise<void> {
  await guild.channels.fetch();

  const categories = guild.channels.cache.filter(
    (c: any) => c.type === 4
  );
  const lines: string[] = [];

  for (const [, category] of categories) {
    lines.push(`\n**${category.name}**`);
    const children = guild.channels.cache
      .filter((c: any) => c.parentId === category.id)
      .map((c: any) => {
        const typeIcon =
          c.type === 0 ? '💬' : c.type === 2 ? '🔊' : c.type === 5 ? '📰' : '❓';
        return `  ${typeIcon} ${c.name}`;
      });
    lines.push(...children);
  }

  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle(`📢 Server Channels (${guild.channels.cache.size})`)
    .setDescription(
      lines.slice(0, 80).join('\n') || 'No channels found'
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function executeCountMembers(
  interaction: ChatInputCommandInteraction,
  guild: any
): Promise<void> {
  await guild.members.fetch();

  const members = guild.members.cache;
  const botCount = members.filter((m: any) => m.user.bot).size;
  const humanCount = members.size - botCount;
  const onlineCount = members.filter(
    (m: any) => m.presence?.status === 'online'
  ).size;

  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle('👥 Member Statistics')
    .addFields(
      {
        name: 'Total Members',
        value: `${members.size}`,
        inline: true,
      },
      {
        name: 'Humans',
        value: `${humanCount}`,
        inline: true,
      },
      {
        name: 'Bots',
        value: `${botCount}`,
        inline: true,
      },
      {
        name: 'Online',
        value: `${onlineCount}`,
        inline: true,
      },
      {
        name: 'Server Created',
        value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
        inline: true,
      }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function executeBanList(
  interaction: ChatInputCommandInteraction,
  guild: any
): Promise<void> {
  const bans = await guild.bans.fetch().catch(() => null);

  if (!bans || bans.size === 0) {
    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('🚫 Ban List')
      .setDescription('No banned users.');

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const banList = bans
    .map((ban: any) => `• **${ban.user.tag}** — Reason: ${ban.reason || 'None'}`)
    .slice(0, 50);

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle(`🚫 Ban List (${bans.size})`)
    .setDescription(banList.join('\n'))
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
