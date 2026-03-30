/**
 * VIP Command - Manage VIP users (grant/revoke/list)
 * Owner/VIP only
 * Subcommands: grant, revoke, list
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import vipHandler, { VIPDurationChoice, VIPTier } from '../../database/vipHandler';
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';
import { AccessLevel } from '../../utils/accessControl';

const DURATION_CHOICES: VIPDurationChoice[] = [
  '1hr',
  '12hr',
  '24hr',
  '3days',
  '7days',
  '14days',
  '30days',
  '6months',
  '1yr',
  'Lifetime',
];

export const data = new SlashCommandBuilder()
  .setName('vip')
  .setDescription('Manage VIP users (grant/revoke/list)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub
      .setName('grant')
      .setDescription('Grant VIP status to a user')
      .addUserOption(opt =>
        opt
          .setName('user')
          .setDescription('User to grant VIP')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt
          .setName('tier')
          .setDescription('Tier to grant')
          .setRequired(true)
          .addChoices(
            { name: 'VIP', value: 'VIP' },
            { name: 'VIP_PRTR', value: 'VIP_PRTR' },
          )
      )
      .addStringOption(opt => {
        let builder = opt
          .setName('duration')
          .setDescription('Duration')
          .setRequired(true);

        for (const choice of DURATION_CHOICES) {
          builder = builder.addChoices({ name: choice, value: choice });
        }

        return builder;
      })
  )
  .addSubcommand(sub =>
    sub
      .setName('revoke')
      .setDescription('Revoke VIP status from a user')
      .addUserOption(opt =>
        opt
          .setName('user')
          .setDescription('User to revoke VIP')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('list')
      .setDescription('List all active VIP users')
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Authorization check
    if (!permissionValidator.validateInteraction(interaction)) {
      const denyEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Unauthorized')
        .setDescription('Only owners and VIPs can use this command.')
        .setFooter({ text: 'Command blocked' });

      await interaction.reply({
        embeds: [denyEmbed],
        ephemeral: true,
      });

      // Log unauthorized attempt
      auditLogger.log({
        action: 'vip',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Unauthorized attempt',
      });

      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'grant') {
      await handleGrant(interaction);
    } else if (subcommand === 'revoke') {
      await handleRevoke(interaction);
    } else if (subcommand === 'list') {
      await handleList(interaction);
    }
  } catch (error) {
    console.error('❌ /vip error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}

async function handleGrant(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!permissionValidator.checkAccess(interaction.user.id, AccessLevel.OWNER)) {
    await interaction.reply({
      content: 'Only OWNER can grant VIP access.',
      ephemeral: true,
    });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);
  const tier = interaction.options.getString('tier', true) as VIPTier;
  const duration = interaction.options.getString('duration', true) as VIPDurationChoice;

  // Prevent self-targeting
  if (targetUser.id === interaction.user.id) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Self-targeting blocked')
      .setDescription("You can't grant VIP to yourself.");

    await interaction.reply({
      embeds: [errorEmbed],
      ephemeral: true,
    });

    auditLogger.log({
      action: 'vip-grant',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      targetId: targetUser.id,
      targetName: targetUser.tag,
      guildId: interaction.guildId!,
      guildName: interaction.guild?.name,
      success: false,
      error: 'Self-targeting attempt',
    });

    return;
  }

  // Prevent bot targeting
  if (targetUser.bot) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Invalid target')
      .setDescription("You can't grant VIP to a bot.");

    await interaction.reply({
      embeds: [errorEmbed],
      ephemeral: true,
    });

    auditLogger.log({
      action: 'vip-grant',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      targetId: targetUser.id,
      targetName: targetUser.tag,
      guildId: interaction.guildId!,
      guildName: interaction.guild?.name,
      success: false,
      error: 'Bot targeting attempt',
    });

    return;
  }

  try {
    const record = vipHandler.grant(targetUser.id, duration, interaction.user.id, tier);
    const expiresText = record.expiresAt === null ? 'Lifetime' : new Date(record.expiresAt).toLocaleString();

    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ VIP Granted')
      .setDescription(`**User:** ${targetUser.tag} (${targetUser.id})`)
      .addFields(
        { name: 'Tier', value: tier, inline: true },
        { name: 'Duration', value: duration, inline: true },
        { name: 'Expires', value: expiresText, inline: false }
      )
      .setTimestamp();

    await interaction.reply({
      embeds: [successEmbed],
      ephemeral: true,
    });

    // Log action
    auditLogger.log({
      action: 'vip-grant',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      targetId: targetUser.id,
      targetName: targetUser.tag,
      guildId: interaction.guildId!,
      guildName: interaction.guild?.name,
      details: { duration, expiresAt: record.expiresAt },
      success: true,
    });
  } catch (error) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Invalid duration')
      .setDescription(
        `Duration error: \`${error instanceof Error ? error.message : 'Unknown error'}\``
      );

    await interaction.reply({
      embeds: [errorEmbed],
      ephemeral: true,
    });

    auditLogger.log({
      action: 'vip-grant',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      targetId: targetUser.id,
      targetName: targetUser.tag,
      guildId: interaction.guildId!,
      guildName: interaction.guild?.name,
      success: false,
      error: `Invalid duration: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}

async function handleRevoke(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!permissionValidator.checkAccess(interaction.user.id, AccessLevel.OWNER)) {
    await interaction.reply({
      content: 'Only OWNER can revoke VIP access.',
      ephemeral: true,
    });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);

  const wasVIP = vipHandler.revoke(targetUser.id);

  if (!wasVIP) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FFAA00')
      .setTitle('⚠️ Not VIP')
      .setDescription(`${targetUser.tag} is not currently VIP.`);

    await interaction.reply({
      embeds: [errorEmbed],
      ephemeral: true,
    });

    auditLogger.log({
      action: 'vip-revoke',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      targetId: targetUser.id,
      targetName: targetUser.tag,
      guildId: interaction.guildId!,
      guildName: interaction.guild?.name,
      success: false,
      error: 'User was not VIP',
    });

    return;
  }

  const successEmbed = new EmbedBuilder()
    .setColor('#FF6600')
    .setTitle('✅ VIP Revoked')
    .setDescription(`**User:** ${targetUser.tag} (${targetUser.id})`)
    .setTimestamp();

  await interaction.reply({
    embeds: [successEmbed],
    ephemeral: true,
  });

  auditLogger.log({
    action: 'vip-revoke',
    executorId: interaction.user.id,
    executorTag: interaction.user.tag,
    targetId: targetUser.id,
    targetName: targetUser.tag,
    guildId: interaction.guildId!,
    guildName: interaction.guild?.name,
    success: true,
  });
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!permissionValidator.checkAccess(interaction.user.id, AccessLevel.VIP)) {
    await interaction.reply({
      content: 'Access denied. Requires VIP level or higher.',
      ephemeral: true,
    });
    return;
  }

  const allVIPs = vipHandler.getAllVIPs();

  if (allVIPs.length === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('📋 VIP List')
      .setDescription('No active VIPs.');

    await interaction.reply({
      embeds: [emptyEmbed],
      ephemeral: true,
    });

    return;
  }

  // Build VIP list (chunk into 25 per message if needed)
  const vipLines = allVIPs.map(vip => {
    const remaining = vipHandler.getRemainingTime(vip.userId);
    const remainingStr = remaining === null ? 'Lifetime' : vipHandler.formatRemainingTime(remaining);
    return `• <@${vip.userId}> — Tier: **${vip.tier}** — Expires in **${remainingStr}**`;
  });

  const listEmbed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle(`📋 VIP List (${allVIPs.length})`)
    .setDescription(vipLines.join('\n'))
    .setTimestamp();

  await interaction.reply({
    embeds: [listEmbed],
    ephemeral: true,
  });

  auditLogger.log({
    action: 'vip-list',
    executorId: interaction.user.id,
    executorTag: interaction.user.tag,
    guildId: interaction.guildId!,
    guildName: interaction.guild?.name,
    details: { totalVIPs: allVIPs.length },
    success: true,
  });
}
