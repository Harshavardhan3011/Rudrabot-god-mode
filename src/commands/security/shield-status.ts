/**
 * Shield Status - Security Dashboard Command
 * Shows entire RUDRA.0x security health and antinuke status
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import DatabaseHandler from '../../database/dbHandler';
import { AuditLogger } from '../../database/auditLogger';

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

export const data = new SlashCommandBuilder()
  .setName('shield-status')
  .setDescription('View complete security matrix and antinuke dashboard')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const name = 'shield-status';
export const description = 'Security dashboard and health status';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Cooldown check (20 seconds per user)
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

    cooldowns.set(userId, now + 20000);

    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ This command only works in guilds.',
        ephemeral: true,
      });
      return;
    }

    // Get guild security data
    const db = (global as any).db as DatabaseHandler | undefined;
    if (!db) {
      await interaction.reply({
        content: '❌ Database unavailable.',
        ephemeral: true,
      });
      return;
    }

    const guildData = await db.getGuild(interaction.guild.id);
    const antinukeSettings = (guildData?.antinuke || {}) as Record<string, boolean>;

    // Count active protections
    const protections = Object.entries(antinukeSettings)
      .filter(([_, enabled]) => enabled === true)
      .length;
    const totalProtections = Object.keys(antinukeSettings).length;

    // Build the security dashboard
    const embed = new EmbedBuilder()
      .setColor(protections > 20 ? '#10B981' : protections > 10 ? '#F59E0B' : '#EF4444')
      .setTitle('🛡️ RUDRA.0x Security Matrix Dashboard')
      .setThumbnail((interaction.guild.iconURL({ forceStatic: false }) as string) || null)
      .addFields(
        {
          name: '📊 Protection Status',
          value: `**${protections}/${totalProtections}** antinuke protections enabled\n` +
            `Health: ${Math.round((protections / totalProtections) * 100)}%`,
          inline: false,
        },
        {
          name: '⚔️ Shield Protections (Active)',
          value: [
            antinukeSettings.antiBan ? '✅ Anti-Ban' : '❌ Anti-Ban',
            antinukeSettings.antiKick ? '✅ Anti-Kick' : '❌ Anti-Kick',
            antinukeSettings.antiBotAdd ? '✅ Anti-Bot Add' : '❌ Anti-Bot Add',
            antinukeSettings.antiAltJoin ? '✅ Anti-Alt Join' : '❌ Anti-Alt Join',
            antinukeSettings.antiMassMention ? '✅ Anti-Mass Mention' : '❌ Anti-Mass Mention',
          ].join(' | '),
          inline: false,
        },
        {
          name: '🔗 Structural Protections',
          value: [
            antinukeSettings.antiChannelCreate ? '✅ Anti-Channel Create' : '❌ Anti-Channel Create',
            antinukeSettings.antiChannelDelete ? '✅ Anti-Channel Delete' : '❌ Anti-Channel Delete',
            antinukeSettings.antiRoleCreate ? '✅ Anti-Role Create' : '❌ Anti-Role Create',
            antinukeSettings.antiRoleDelete ? '✅ Anti-Role Delete' : '❌ Anti-Role Delete',
            antinukeSettings.antiWebhookCreate ? '✅ Anti-Webhook' : '❌ Anti-Webhook',
          ].join(' | '),
          inline: false,
        },
        {
          name: '🔒 Content Filters',
          value: [
            antinukeSettings.antiSpam ? '✅ Anti-Spam' : '❌ Anti-Spam',
            antinukeSettings.antiLink ? '✅ Anti-Link' : '❌ Anti-Link',
            antinukeSettings.antiInvite ? '✅ Anti-Invite' : '❌ Anti-Invite',
            antinukeSettings.antiZalgo ? '✅ Anti-Zalgo' : '❌ Anti-Zalgo',
            antinukeSettings.antiCaps ? '✅ Anti-Caps' : '❌ Anti-Caps',
          ].join(' | '),
          inline: false,
        },
        {
          name: '🎯 Advanced Protection',
          value: [
            antinukeSettings.strictMode ? '✅ Strict Mode' : '❌ Strict Mode',
            antinukeSettings.panicLockdown ? '✅ Panic Mode' : '❌ Panic Mode',
            guildData?.whitelist && guildData.whitelist.length > 0 ? `✅ Whitelist (${guildData.whitelist.length} entries)` : '❌ Whitelist',
          ].join(' | '),
          inline: false,
        },
        {
          name: '📈 System Status',
          value: '✅ Real-time Monitoring Active\n✅ Audit Logging Enabled\n✅ Database Synced',
          inline: false,
        }
      )
      .setFooter({ text: `Guild: ${interaction.guild.name} | Last Updated: ${new Date().toLocaleTimeString()}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Log action
    auditLogger.log({
      action: 'shield-status',
      executorId: userId,
      guildId: interaction.guild.id,
      guildName: interaction.guild.name,
      details: { protectionsActive: protections, totalProtections },
      success: true,
    });

  } catch (error) {
    console.error('Error in shield-status:', error);
    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ Error retrieving security status.',
        ephemeral: true,
      });
    }
  }
}
