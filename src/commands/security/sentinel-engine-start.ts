/**
 * Sentinel Engine Start - Enable background monitoring system
 */
import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder, 
  PermissionFlagsBits 
} from 'discord.js';
import DatabaseHandler from '../../database/dbHandler';
import { AuditLogger } from '../../database/auditLogger';

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();
const activeMonitoring = new Map<string, boolean>();

export const data = new SlashCommandBuilder()
  .setName('sentinel-engine-start')
  .setDescription('Enable background SentinelScan monitoring system.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const name = 'sentinel-engine-start';
export const description = 'Boots up the background SentinelScan monitoring system.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Cooldown check (15 seconds per user)
    const userId = interaction.user.id;
    const now = Date.now();
    const cooldownExpires = cooldowns.get(userId);
    
    if (cooldownExpires && cooldownExpires > now) {
      const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
      await interaction.reply({
        content: `⏳ Command on cooldown. Try again in ${secondsLeft}s.`,
        ephemeral: true,
      });
      return;
    }

    cooldowns.set(userId, now + 15000);

    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ This command only works in guilds.',
        ephemeral: true,
      });
      return;
    }

    // Check if already running
    const isAlreadyRunning = activeMonitoring.get(interaction.guild.id);
    if (isAlreadyRunning) {
      await interaction.reply({
        content: '⚠️ SentinelScan engine is already running on this server.',
        ephemeral: true,
      });
      return;
    }

    // Get database
    const db = (global as any).db as DatabaseHandler | undefined;
    if (!db) {
      await interaction.reply({
        content: '❌ Database unavailable.',
        ephemeral: true,
      });
      return;
    }

    // Fetch current guild data
    const guildData = await db.getGuild(interaction.guild.id);
    if (!guildData) {
      await interaction.reply({
        content: '❌ Guild not initialized in database.',
        ephemeral: true,
      });
      return;
    }

    // Enable monitoring in database
    guildData.modules = guildData.modules || {};
    const wasAlreadyEnabled = guildData.modules.sentinelScan === true;
    
    if (wasAlreadyEnabled) {
      await interaction.reply({
        content: '⚠️ SentinelScan module is already enabled in guild settings.',
        ephemeral: true,
      });
      return;
    }

    // Enable sentinel scan
    guildData.modules.sentinelScan = true;
    guildData.updatedAt = Date.now();

    const saved = await db.setGuild(interaction.guild.id, guildData);

    if (!saved) {
      await interaction.reply({
        content: '❌ Failed to enable SentinelScan. Please try again.',
        ephemeral: true,
      });
      return;
    }

    // Mark as active in runtime memory
    activeMonitoring.set(interaction.guild.id, true);

    // Build response embed
    const embed = new EmbedBuilder()
      .setColor('#10B981')
      .setTitle('✅ SentinelScan Engine Started')
      .setDescription('Background threat detection now active')
      .addFields(
        {
          name: '🎯 Monitoring Active',
          value: [
            '✅ Real-time member scanning',
            '✅ Message content analysis',
            '✅ File threat detection',
            '✅ URL blacklist checking',
            '✅ Raid detection',
            '✅ Alt account filtering',
          ].join('\n'),
          inline: false,
        },
        {
          name: '⏱️ Engine Status',
          value: `**Status:** RUNNING\n**Started:** ${new Date().toLocaleTimeString()}\n**Guild:** ${interaction.guild.name}`,
          inline: false,
        },
        {
          name: '📊 Detection Coverage',
          value: [
            '🔴 Crash videos',
            '🔴 IP loggers',
            '🔴 Token grabbers',
            '🔴 Phishing links',
            '🔴 Crypto scams',
          ].join(' | '),
          inline: false,
        }
      )
      .setFooter({ text: 'RUDRA.0x SentinelScan | Real-time Protection Enabled' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Log action
    auditLogger.log({
      action: 'sentinel-engine-start',
      executorId: userId,
      guildId: interaction.guild.id,
      guildName: interaction.guild.name,
      details: { module: 'sentinel-scan', enabled: true },
      success: true,
    });

  } catch (error) {
    console.error('Error in sentinel-engine-start:', error);
    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ Error starting SentinelScan engine.',
        ephemeral: true,
      });
    }
  }
}
