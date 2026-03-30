/**
 * Channel Clone Safe Command - Clone a channel with all settings (safe method)
 * Owner/VIP only
 * Clones permissions, topic, slowmode, bitrate, user limit, etc.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  GuildChannel,
} from 'discord.js';
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';

export const data = new SlashCommandBuilder()
  .setName('channel-clone-safe')
  .setDescription('Clone a channel with all settings (safe method)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(opt =>
    opt
      .setName('channel')
      .setDescription('Channel to clone')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt
      .setName('new_name')
      .setDescription('New channel name (optional)')
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
        action: 'channel-clone-safe',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Unauthorized attempt',
      });

      return;
    }

    const channelId = interaction.options.getChannel('channel', true).id;
    const guild = interaction.guild;

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Fetch the full channel object
    const sourceChannel = (await guild.channels.fetch(channelId)) as any;
    const newName = interaction.options.getString('new_name') || sourceChannel?.name || 'cloned-channel';

    // Validate channel type
    if (
      sourceChannel.type !== ChannelType.GuildText &&
      sourceChannel.type !== ChannelType.GuildVoice &&
      sourceChannel.type !== ChannelType.GuildCategory &&
      sourceChannel.type !== ChannelType.GuildNews
    ) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Unsupported channel type')
        .setDescription(
          'Can only clone: Text, Voice, Category, or News channels.'
        );

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
      // Prepare clone options
      const cloneOptions: any = {
        name: newName,
        type: sourceChannel.type,
        reason: `[CLONE] Cloned by ${interaction.user.tag}`,
      };

      // Copy channel-specific properties
      if (sourceChannel.type === ChannelType.GuildText) {
        const textChannel = sourceChannel as any;
        cloneOptions.topic = textChannel.topic;
        cloneOptions.nsfw = textChannel.nsfw;
        cloneOptions.rateLimitPerUser = textChannel.rateLimitPerUser; // slowmode
      }

      if (sourceChannel.type === ChannelType.GuildVoice) {
        const voiceChannel = sourceChannel as any;
        cloneOptions.bitrate = voiceChannel.bitrate;
        cloneOptions.userLimit = voiceChannel.userLimit;
      }

      // Clone the channel
      const clonedChannel = await sourceChannel.clone({
        ...cloneOptions,
      });

      // Copy permission overwrites
      if (sourceChannel.type !== ChannelType.GuildCategory) {
        try {
          const perms = (sourceChannel as any).permissionOverwrites?.cache;
          if (perms) {
            for (const [, overwrite] of perms) {
              await clonedChannel.permissionOverwrites.create(overwrite.id, {
                allow: overwrite.allow.bitfield,
                deny: overwrite.deny.bitfield,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to copy permission overwrite:`, error);
        }
      }

      // Place in same category if not a category itself
      if (
        sourceChannel.type !== ChannelType.GuildCategory &&
        (sourceChannel as any).parentId
      ) {
        try {
          await clonedChannel.setParent((sourceChannel as any).parentId);
        } catch (error) {
          console.error('Failed to set parent:', error);
        }
      }

      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Channel Cloned')
        .addFields(
          {
            name: 'Source',
            value: `<#${sourceChannel.id}>`,
            inline: true,
          },
          {
            name: 'Clone',
            value: `<#${clonedChannel.id}>`,
            inline: true,
          },
          {
            name: 'Channel Name',
            value: `\`${clonedChannel.name}\``,
            inline: true,
          },
          {
            name: 'Type',
            value: sourceChannel.type.toString(),
            inline: true,
          },
          {
            name: 'Properties Copied',
            value:
              sourceChannel.type === ChannelType.GuildText
                ? '• Topic\n• NSFW\n• Slowmode\n• Permissions'
                : sourceChannel.type === ChannelType.GuildVoice
                  ? '• Bitrate\n• User Limit\n• Permissions'
                  : '• Permissions',
            inline: false,
          }
        )
        .setFooter({
          text: 'All settings and permissions have been copied.',
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [successEmbed],
      });

      auditLogger.log({
        action: 'channel-clone-safe',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: sourceChannel.id,
        targetName: sourceChannel.name || 'unknown',
        guildId: guild.id,
        guildName: guild.name,
        details: {
          sourceChannelId: sourceChannel.id,
          clonedChannelId: clonedChannel.id,
          channelType: sourceChannel.type,
        },
        success: true,
      });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Clone failed')
        .setDescription(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

      await interaction.editReply({
        embeds: [errorEmbed],
      });

      auditLogger.log({
        action: 'channel-clone-safe',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: sourceChannel.id,
        targetName: sourceChannel.name,
        guildId: guild.id,
        guildName: guild.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } catch (error) {
    console.error('❌ /channel-clone-safe error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}
