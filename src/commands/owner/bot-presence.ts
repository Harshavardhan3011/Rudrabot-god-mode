/**
 * Bot Presence Command - Set bot status and activity
 * Owner only
 * Subcommands: set, reset, watching, listening
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ActivityType,
  PresenceStatusData,
} from 'discord.js';
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';

export const data = new SlashCommandBuilder()
  .setName('bot-presence')
  .setDescription('Set or reset bot presence/status')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub
      .setName('set')
      .setDescription('Set custom bot status')
      .addStringOption(opt =>
        opt
          .setName('text')
          .setDescription('Status text (max 128 chars)')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt
          .setName('type')
          .setDescription('Activity type')
          .setRequired(true)
          .addChoices(
            { name: 'Playing', value: 'PLAYING' },
            { name: 'Streaming', value: 'STREAMING' },
            { name: 'Listening', value: 'LISTENING' },
            { name: 'Watching', value: 'WATCHING' }
          )
      )
      .addStringOption(opt =>
        opt
          .setName('status')
          .setDescription('Online status')
          .setRequired(false)
          .addChoices(
            { name: 'Online', value: 'online' },
            { name: 'Idle', value: 'idle' },
            { name: 'Do Not Disturb', value: 'dnd' },
            { name: 'Invisible', value: 'invisible' }
          )
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('reset')
      .setDescription('Reset bot to default presence')
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Authorization check - Owner only
    if (!permissionValidator.isOwner(interaction.user.id)) {
      const denyEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Owner Only')
        .setDescription('This command is restricted to server owners.');

      await interaction.reply({
        embeds: [denyEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'bot-presence',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Non-owner attempt',
      });

      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'set') {
      await handleSet(interaction);
    } else if (subcommand === 'reset') {
      await handleReset(interaction);
    }
  } catch (error) {
    console.error('❌ /bot-presence error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}

async function handleSet(interaction: ChatInputCommandInteraction): Promise<void> {
  const text = interaction.options.getString('text', true);
  const typeStr = interaction.options.getString('type', true);
  const status = (interaction.options.getString('status') || 'online') as PresenceStatusData;

  // Validate text length
  if (text.length > 128) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Text too long')
      .setDescription('Status text must be 128 characters or less.');

    await interaction.reply({
      embeds: [errorEmbed],
      ephemeral: true,
    });

    return;
  }

  // Map type string to ActivityType
  const activityTypeMap: Record<string, ActivityType> = {
    PLAYING: ActivityType.Playing,
    STREAMING: ActivityType.Streaming,
    LISTENING: ActivityType.Listening,
    WATCHING: ActivityType.Watching,
  };

  const activityType = activityTypeMap[typeStr] || ActivityType.Playing;

  try {
    // Set presence
    await interaction.client.user?.setPresence({
      activities: [
        {
          name: text,
          type: activityType,
        },
      ],
      status,
    });

    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Presence Updated')
      .addFields(
        {
          name: 'Text',
          value: `\`${text}\``,
          inline: true,
        },
        {
          name: 'Type',
          value: typeStr,
          inline: true,
        },
        {
          name: 'Status',
          value: status.charAt(0).toUpperCase() + status.slice(1),
          inline: true,
        }
      )
      .setFooter({ text: 'Bot presence updated' })
      .setTimestamp();

    await interaction.reply({
      embeds: [successEmbed],
      ephemeral: true,
    });

    auditLogger.log({
      action: 'bot-presence-set',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      guildId: interaction.guildId!,
      guildName: interaction.guild?.name,
      details: { text, type: typeStr, status },
      success: true,
    });
  } catch (error) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Failed to update presence')
      .setDescription(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

    await interaction.reply({
      embeds: [errorEmbed],
      ephemeral: true,
    });

    auditLogger.log({
      action: 'bot-presence-set',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      guildId: interaction.guildId!,
      guildName: interaction.guild?.name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function handleReset(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Reset to default presence
    await interaction.client.user?.setPresence({
      activities: [
        {
          name: '/help',
          type: ActivityType.Playing,
        },
      ],
      status: 'online',
    });

    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Presence Reset')
      .setDescription('Bot presence reset to default (**Playing /help**).')
      .setTimestamp();

    await interaction.reply({
      embeds: [successEmbed],
      ephemeral: true,
    });

    auditLogger.log({
      action: 'bot-presence-reset',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      guildId: interaction.guildId!,
      guildName: interaction.guild?.name,
      success: true,
    });
  } catch (error) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Failed to reset presence')
      .setDescription(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

    await interaction.reply({
      embeds: [errorEmbed],
      ephemeral: true,
    });

    auditLogger.log({
      action: 'bot-presence-reset',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      guildId: interaction.guildId!,
      guildName: interaction.guild?.name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
