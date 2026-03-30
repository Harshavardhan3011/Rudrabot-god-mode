/**
 * Unmute User Command - Restore messaging permissions to a muted user
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
  .setName('unmute-user')
  .setDescription('Unmute a user (restore messaging permissions)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption(opt =>
    opt
      .setName('user')
      .setDescription('User to unmute')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt
      .setName('reason')
      .setDescription('Reason for unmute')
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
        action: 'unmute-user',
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
      let unmuteCount = 0;
      let failCount = 0;

      // Remove Send Messages deny in all text channels
      for (const [, channel] of guild.channels.cache) {
        if (channel.type === ChannelType.GuildText) {
          try {
            const overwrite = channel.permissionOverwrites.cache.get(targetUser.id);
            if (overwrite && overwrite.deny.has('SendMessages')) {
              await channel.permissionOverwrites.delete(targetUser.id);
              unmuteCount++;
            }
          } catch (error) {
            console.error(`Failed to unmute in ${channel.id}:`, error);
            failCount++;
          }
        }
      }

      if (unmuteCount === 0 && failCount === 0) {
        const warningEmbed = new EmbedBuilder()
          .setColor('#FFAA00')
          .setTitle('⚠️ No mutes found')
          .setDescription(`${targetUser.tag} does not have any active mutes.`);

        await interaction.editReply({
          embeds: [warningEmbed],
        });

        return;
      }

      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔊 User Unmuted')
        .setDescription(`**User:** ${targetUser.tag}`)
        .addFields(
          {
            name: 'Channels Unmuted',
            value: `${unmuteCount}`,
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
          text: 'User can now send messages in text channels.',
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [successEmbed],
      });

      auditLogger.log({
        action: 'unmute-user',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetUser.id,
        targetName: targetUser.tag,
        guildId: guild.id,
        guildName: guild.name,
        details: { reason, channelsUnmuted: unmuteCount },
        success: true,
      });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Unmute failed')
        .setDescription(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

      await interaction.editReply({
        embeds: [errorEmbed],
      });

      auditLogger.log({
        action: 'unmute-user',
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
    console.error('❌ /unmute-user error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}
