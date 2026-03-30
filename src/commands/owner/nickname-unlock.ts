/**
 * Nickname Unlock Command - Unlock a user's nickname
 * Owner/VIP only
 * Removes nickname lock restriction
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { lockHandler } from './nickname-lock';
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';

export const data = new SlashCommandBuilder()
  .setName('nickname-unlock')
  .setDescription('Unlock a user\'s nickname')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption(opt =>
    opt
      .setName('user')
      .setDescription('User whose nickname to unlock')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt
      .setName('reason')
      .setDescription('Reason for unlock')
      .setRequired(false)
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
        action: 'nickname-unlock',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Unauthorized attempt',
      });

      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guild = interaction.guild;

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Check if lock exists
    const lock = lockHandler.getLock(targetUser.id, guild.id);
    if (!lock) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FFAA00')
        .setTitle('⚠️ Not locked')
        .setDescription(`${targetUser.tag}'s nickname is not locked.`);

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'nickname-unlock',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetUser.id,
        targetName: targetUser.tag,
        guildId: guild.id,
        guildName: guild.name,
        success: false,
        error: 'Nickname was not locked',
      });

      return;
    }

    // Unlock the nickname
    lockHandler.unlock(targetUser.id, guild.id);

    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🔓 Nickname Unlocked')
      .setDescription(`**User:** ${targetUser.tag}`)
      .addFields(
        {
          name: 'Was Locked As',
          value: `\`${lock.lockedNickname}\``,
          inline: true,
        },
        {
          name: 'Locked Duration',
          value: formatDuration(Date.now() - lock.lockedAt),
          inline: true,
        },
        {
          name: 'Reason',
          value: reason,
          inline: false,
        }
      )
      .setFooter({
        text: 'User can now change their nickname freely.',
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [successEmbed],
      ephemeral: true,
    });

    auditLogger.log({
      action: 'nickname-unlock',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      targetId: targetUser.id,
      targetName: targetUser.tag,
      guildId: guild.id,
      guildName: guild.name,
      details: { wasLockedAs: lock.lockedNickname, reason },
      success: true,
    });
  } catch (error) {
    console.error('❌ /nickname-unlock error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}

function formatDuration(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
