/**
 * System Health Command - Check bot performance metrics
 * Owner/VIP only
 * Displays: memory usage, uptime, ping, commands loaded
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';

export const data = new SlashCommandBuilder()
  .setName('system-health')
  .setDescription('Check bot system health and performance metrics')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

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
        action: 'system-health',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Unauthorized attempt',
      });

      return;
    }

    const client = interaction.client;

    // Calculate metrics
    const uptime = client.uptime || 0;
    const uptimeStr = formatUptime(uptime);
    const memoryUsage = process.memoryUsage();
    const memoryMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    const memoryLimit = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
    const ping = client.ws.ping;
    const guilds = client.guilds.cache.size;
    const users = client.users.cache.size;
    const channels = client.channels.cache.size;

    // Process info
    const cpuUsage = process.cpuUsage();
    const cpuUser = (cpuUsage.user / 1000).toFixed(2);
    const cpuSystem = (cpuUsage.system / 1000).toFixed(2);

    // Health status
    const memoryHealthy = parseFloat(memoryMB) < parseFloat(memoryLimit) * 0.9;
    const pingHealthy = ping < 100;

    const healthEmbed = new EmbedBuilder()
      .setColor(memoryHealthy && pingHealthy ? '#00FF00' : '#FFAA00')
      .setTitle('🤖 System Health Report')
      .addFields(
        {
          name: '⏱️ Uptime',
          value: uptimeStr,
          inline: true,
        },
        {
          name: '📊 Memory Usage',
          value: `${memoryMB}MB / ${memoryLimit}MB`,
          inline: true,
        },
        {
          name: '🔴 WebSocket Ping',
          value: `${ping}ms`,
          inline: true,
        },
        {
          name: '🌍 Guilds Connected',
          value: `${guilds}`,
          inline: true,
        },
        {
          name: '👥 Users Cached',
          value: `${users}`,
          inline: true,
        },
        {
          name: '📢 Channels Cached',
          value: `${channels}`,
          inline: true,
        },
        {
          name: '💻 CPU Time',
          value: `User: ${cpuUser}ms | System: ${cpuSystem}ms`,
          inline: true,
        },
        {
          name: '⚙️ Node Version',
          value: `${process.version}`,
          inline: true,
        },
        {
          name: '📦 Platform',
          value: `${process.platform}`,
          inline: true,
        }
      )
      .setFooter({ text: 'Health check completed' })
      .setTimestamp();

    // Add status indicators
    if (!memoryHealthy) {
      healthEmbed.addFields({
        name: '⚠️ Warning',
        value: '⚠️ Memory usage is high. Consider restarting the bot.',
        inline: false,
      });
    }

    if (!pingHealthy) {
      healthEmbed.addFields({
        name: '⚠️ Warning',
        value: '⚠️ WebSocket ping is elevated. Check connection quality.',
        inline: false,
      });
    }

    await interaction.reply({
      embeds: [healthEmbed],
      ephemeral: true,
    });

    auditLogger.log({
      action: 'system-health',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      guildId: interaction.guildId!,
      guildName: interaction.guild?.name,
      details: {
        uptime,
        memoryMB: parseFloat(memoryMB),
        ping,
        guilds,
      },
      success: true,
    });
  } catch (error) {
    console.error('❌ /system-health error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}

function formatUptime(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
