/**
 * Private VC Create Command - Create a private hidden voice channel
 * Owner/VIP only
 * Channel is hidden from @everyone
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
  .setName('private-vc-create')
  .setDescription('Create a private voice channel (hidden from @everyone)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt =>
    opt
      .setName('name')
      .setDescription('Channel name')
      .setRequired(true)
  )
  .addUserOption(opt =>
    opt
      .setName('owner')
      .setDescription('User who can access the channel')
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
        action: 'private-vc-create',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Unauthorized attempt',
      });

      return;
    }

    const channelName = interaction.options.getString('name', true);
    const ownerUser = interaction.options.getUser('owner');
    const guild = interaction.guild;

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Validate channel name
    if (channelName.length > 100 || channelName.length < 1) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Invalid name')
        .setDescription('Channel name must be 1-100 characters.');

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
      // Create voice channel
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        reason: `[PRIVATE VC] Created by ${interaction.user.tag}`,
      });

      // Deny @everyone access
      await channel.permissionOverwrites.create(guild.roles.everyone, {
        ViewChannel: false,
        Connect: false,
      });

      // If owner specified, grant access
      if (ownerUser) {
        await channel.permissionOverwrites.create(ownerUser.id, {
          ViewChannel: true,
          Connect: true,
        });
      }

      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Private Voice Channel Created')
        .addFields(
          {
            name: 'Channel',
            value: `<#${channel.id}>`,
            inline: true,
          },
          {
            name: 'Channel ID',
            value: `\`${channel.id}\``,
            inline: true,
          },
          {
            name: 'Visibility',
            value: 'Hidden from @everyone',
            inline: true,
          },
          {
            name: 'Owner',
            value: ownerUser ? `<@${ownerUser.id}>` : 'None specified',
            inline: true,
          }
        )
        .setFooter({
          text: 'Channel is private and hidden from regular members.',
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [successEmbed],
      });

      auditLogger.log({
        action: 'private-vc-create',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: ownerUser?.id,
        targetName: ownerUser?.tag,
        guildId: guild.id,
        guildName: guild.name,
        details: { channelId: channel.id, channelName, owner: ownerUser?.id },
        success: true,
      });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Failed to create channel')
        .setDescription(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

      await interaction.editReply({
        embeds: [errorEmbed],
      });

      auditLogger.log({
        action: 'private-vc-create',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: guild.id,
        guildName: guild.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } catch (error) {
    console.error('❌ /private-vc-create error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}
