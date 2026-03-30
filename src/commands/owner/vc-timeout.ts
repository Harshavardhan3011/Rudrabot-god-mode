/**
 * VC Timeout Command - Temporarily disconnect all users from a voice channel
 * Owner/VIP only
 * Useful for emergency situations (raids, spam)
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
  .setName('vc-timeout')
  .setDescription('Temporarily disconnect all users from a voice channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(opt =>
    opt
      .setName('channel')
      .setDescription('Voice channel to timeout')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildVoice)
  )
  .addStringOption(opt =>
    opt
      .setName('reason')
      .setDescription('Reason for timeout')
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
        action: 'vc-timeout',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Unauthorized attempt',
      });

      return;
    }

    const channel = interaction.options.getChannel('channel', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guild = interaction.guild;

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Verify channel is voice
    if (channel.type !== ChannelType.GuildVoice) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Invalid channel')
        .setDescription('This command only works with voice channels.');

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      return;
    }

    // Check if bot has required permissions
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.MoveMembers)) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Missing permissions')
        .setDescription('Bot needs **Move Members** permission.');

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const voiceChannel = channel as any;
      const members = voiceChannel.members;
      const memberCount = members?.size || 0;

      if (memberCount === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setColor('#FFAA00')
          .setTitle('⚠️ Channel empty')
          .setDescription('No members in this voice channel.');

        await interaction.editReply({
          embeds: [emptyEmbed],
        });

        return;
      }

      let disconnectedCount = 0;
      let failCount = 0;

      // Disconnect each member
      for (const [, member] of members) {
        try {
          await member.voice.disconnect('VC Timeout');
          disconnectedCount++;
        } catch (error) {
          console.error(`Failed to disconnect ${member.user.tag}:`, error);
          failCount++;
        }
      }

      const successEmbed = new EmbedBuilder()
        .setColor('#FF6600')
        .setTitle('⏱️ Voice Channel Timeout')
        .setDescription(`**Channel:** <#${channel.id}>`)
        .addFields(
          {
            name: 'Disconnected',
            value: `${disconnectedCount}/${memberCount}`,
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
          text: 'Users can rejoin the voice channel.',
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [successEmbed],
      });

      auditLogger.log({
        action: 'vc-timeout',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: channel.id,
        targetName: channel.name || 'unknown',
        guildId: guild.id,
        guildName: guild.name,
        details: { reason, disconnectedCount, memberCount },
        success: true,
      });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Timeout failed')
        .setDescription(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

      await interaction.editReply({
        embeds: [errorEmbed],
      });

      auditLogger.log({
        action: 'vc-timeout',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: channel.id,
        targetName: channel.name || 'unknown',
        guildId: guild.id,
        guildName: guild.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } catch (error) {
    console.error('❌ /vc-timeout error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}
