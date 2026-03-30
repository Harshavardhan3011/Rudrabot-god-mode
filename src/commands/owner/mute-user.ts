/**
 * Mute User Command - Mute a user by assigning muted role and denying Send Messages
 * Owner/VIP only
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';

export const data = new SlashCommandBuilder()
  .setName('mute-user')
  .setDescription('Mute a user (prevent message sending)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption(opt =>
    opt
      .setName('user')
      .setDescription('User to mute')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt
      .setName('reason')
      .setDescription('Reason for mute')
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
        action: 'mute-user',
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

    // Prevent self-muting
    if (targetUser.id === interaction.user.id) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Self-targeting blocked')
        .setDescription("You can't mute yourself.");

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'mute-user',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetUser.id,
        targetName: targetUser.tag,
        guildId: guild.id,
        guildName: guild.name,
        success: false,
        error: 'Self-targeting attempt',
      });

      return;
    }

    // Get target member
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Member not found')
        .setDescription(`${targetUser.tag} is not a member of this server.`);

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      return;
    }

    // Check if bot has required permissions
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Missing permissions')
        .setDescription('Bot needs **Manage Channels** permission.');

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      let muteCount = 0;
      let failCount = 0;

      // Deny Send Messages permission in all text channels
      for (const [, channel] of guild.channels.cache) {
        if (channel.type === ChannelType.GuildText) {
          try {
            await channel.permissionOverwrites.create(targetUser.id, {
              SendMessages: false,
              SendMessagesInThreads: false,
            });
            muteCount++;
          } catch (error) {
            console.error(`Failed to mute in ${channel.id}:`, error);
            failCount++;
          }
        }
      }

      const successEmbed = new EmbedBuilder()
        .setColor('#FF6600')
        .setTitle('🔇 User Muted')
        .setDescription(`**User:** ${targetUser.tag}`)
        .addFields(
          {
            name: 'Channels Muted',
            value: `${muteCount}`,
            inline: true,
          },
          {
            name: 'Failed',
            value: `${failCount}`,
            inline: true,
          },
          {
            name: 'Reason',
            value: reason,
            inline: false,
          }
        )
        .setFooter({
          text: 'User cannot send messages in any text channel. Use /unmute-user to restore.',
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [successEmbed],
      });

      auditLogger.log({
        action: 'mute-user',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetUser.id,
        targetName: targetUser.tag,
        guildId: guild.id,
        guildName: guild.name,
        details: { reason, channelsMuted: muteCount },
        success: true,
      });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Mute failed')
        .setDescription(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

      await interaction.editReply({
        embeds: [errorEmbed],
      });

      auditLogger.log({
        action: 'mute-user',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetUser.id,
        targetName: targetUser.tag,
        guildId: guild.id,
        guildName: guild.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } catch (error) {
    console.error('❌ /mute-user error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}
