/**
 * Audit Log View Command - View audit logs with filtering
 * Owner/VIP only
 * Subcommands: recent, user, action
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import auditLogger, { AuditLog } from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';

export const data = new SlashCommandBuilder()
  .setName('audit-log-view')
  .setDescription('View audit logs with filtering')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub
      .setName('recent')
      .setDescription('View recent audit logs')
      .addIntegerOption(opt =>
        opt
          .setName('limit')
          .setDescription('Number of logs to show (default 20)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(50)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('user')
      .setDescription('View logs for a specific user')
      .addUserOption(opt =>
        opt
          .setName('user')
          .setDescription('User to filter by')
          .setRequired(true)
      )
      .addIntegerOption(opt =>
        opt
          .setName('limit')
          .setDescription('Number of logs to show (default 20)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(50)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('action')
      .setDescription('View logs for a specific action')
      .addStringOption(opt =>
        opt
          .setName('action')
          .setDescription('Action to filter by (e.g., vip-grant, mute-user)')
          .setRequired(true)
      )
      .addIntegerOption(opt =>
        opt
          .setName('limit')
          .setDescription('Number of logs to show (default 20)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(50)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Authorization check
    if (!permissionValidator.validateInteraction(interaction)) {
      const denyEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Unauthorized')
        .setDescription('Only owners and VIPs can use this command.');

      await interaction.reply({
        embeds: [denyEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'audit-log-view',
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

    if (subcommand === 'recent') {
      await handleRecent(interaction);
    } else if (subcommand === 'user') {
      await handleUser(interaction);
    } else if (subcommand === 'action') {
      await handleAction(interaction);
    }
  } catch (error) {
    console.error('❌ /audit-log-view error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}

async function handleRecent(interaction: ChatInputCommandInteraction): Promise<void> {
  const limit = interaction.options.getInteger('limit') || 20;
  const logs = auditLogger.getRecentLogs(limit);

  if (logs.length === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('📋 Recent Audit Logs')
      .setDescription('No logs found.');

    await interaction.reply({
      embeds: [emptyEmbed],
      ephemeral: true,
    });

    return;
  }

  // Create embed with log entries
  const logLines = logs
    .reverse()
    .slice(0, limit)
    .map(log => auditLogger.formatLog(log));

  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle(`📋 Recent Audit Logs (${logs.length})`)
    .setDescription(logLines.join('\n'))
    .setFooter({ text: `Showing last ${limit} entries` })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

async function handleUser(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser('user', true);
  const limit = interaction.options.getInteger('limit') || 20;

  const logs = auditLogger.getLogsForUser(targetUser.id, limit);

  if (logs.length === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('📋 Audit Logs')
      .setDescription(`No logs found for ${targetUser.tag}.`);

    await interaction.reply({
      embeds: [emptyEmbed],
      ephemeral: true,
    });

    return;
  }

  const logLines = logs
    .reverse()
    .slice(0, limit)
    .map(log => auditLogger.formatLog(log));

  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle(`📋 Audit Logs for ${targetUser.tag}`)
    .setDescription(logLines.join('\n'))
    .setFooter({ text: `${logs.length} actions` })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

async function handleAction(interaction: ChatInputCommandInteraction): Promise<void> {
  const actionName = interaction.options.getString('action', true);
  const limit = interaction.options.getInteger('limit') || 20;

  const logs = auditLogger.getLogsForAction(actionName, limit);

  if (logs.length === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('📋 Audit Logs')
      .setDescription(`No logs found for action: \`${actionName}\`.`);

    await interaction.reply({
      embeds: [emptyEmbed],
      ephemeral: true,
    });

    return;
  }

  const logLines = logs
    .reverse()
    .slice(0, limit)
    .map(log => auditLogger.formatLog(log));

  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle(`📋 Audit Logs for \`${actionName}\``)
    .setDescription(logLines.join('\n'))
    .setFooter({ text: `${logs.length} occurrences` })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}
