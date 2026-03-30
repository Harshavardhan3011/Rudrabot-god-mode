/**
 * Server Lockdown Command - Emergency lockdown for message/voice activity
 * Owner/VIP only
 * Subcommands: enable, disable
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

interface LockdownState {
  enabled: boolean;
  startedAt: number;
  enabledBy: string;
  reason: string;
  lockedChannels: Set<string>;
}

// Store lockdown state in memory (would be DB in production)
const lockdownStates = new Map<string, LockdownState>();

export const data = new SlashCommandBuilder()
  .setName('server-lockdown')
  .setDescription('Lock down server activity (emergency mode)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub
      .setName('enable')
      .setDescription('Enable lockdown (disable messaging/voice)')
      .addStringOption(opt =>
        opt
          .setName('reason')
          .setDescription('Reason for lockdown')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('disable')
      .setDescription('Disable lockdown (restore permissions)')
  )
  .addSubcommand(sub =>
    sub
      .setName('status')
      .setDescription('Check lockdown status')
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
        action: 'server-lockdown',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Unauthorized attempt',
      });

      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'enable') {
      await handleEnable(interaction);
    } else if (subcommand === 'disable') {
      await handleDisable(interaction);
    } else if (subcommand === 'status') {
      await handleStatus(interaction);
    }
  } catch (error) {
    console.error('❌ /server-lockdown error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}

async function handleEnable(interaction: ChatInputCommandInteraction): Promise<void> {
  const reason = interaction.options.getString('reason', true);
  const guild = interaction.guild;

  if (!guild) {
    throw new Error('Guild not found');
  }

  // Check if already locked
  const currentLockdown = lockdownStates.get(guild.id);
  if (currentLockdown?.enabled) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FFAA00')
      .setTitle('⚠️ Already locked down')
      .setDescription(
        `Server was locked by <@${currentLockdown.enabledBy}> at <t:${Math.floor(currentLockdown.startedAt / 1000)}:T>`
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

  const lockedChannels = new Set<string>();
  let successCount = 0;
  let failCount = 0;

  // Lock all text channels
  for (const [, channel] of guild.channels.cache) {
    if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: false,
          Connect: false,
        });
        lockedChannels.add(channel.id);
        successCount++;
      } catch (error) {
        console.error(`Failed to lock channel ${channel.id}:`, error);
        failCount++;
      }
    }
  }

  // Store lockdown state
  lockdownStates.set(guild.id, {
    enabled: true,
    startedAt: Date.now(),
    enabledBy: interaction.user.id,
    reason,
    lockedChannels,
  });

  const successEmbed = new EmbedBuilder()
    .setColor('#FF6600')
    .setTitle('🔒 Server Lockdown Enabled')
    .setDescription(`Reason: **${reason}**`)
    .addFields(
      {
        name: 'Channels Locked',
        value: `${successCount} channel(s)`,
        inline: true,
      },
      {
        name: 'Failed',
        value: `${failCount} channel(s)`,
        inline: true,
      },
      {
        name: 'Permissions Revoked',
        value: '• Send Messages\n• Connect to Voice',
        inline: true,
      }
    )
    .setFooter({ text: 'Use /server-lockdown disable to restore' })
    .setTimestamp();

  await interaction.editReply({
    embeds: [successEmbed],
  });

  auditLogger.log({
    action: 'server-lockdown-enable',
    executorId: interaction.user.id,
    executorTag: interaction.user.tag,
    guildId: guild.id,
    guildName: guild.name,
    details: { reason, lockedChannels: successCount },
    success: true,
  });
}

async function handleDisable(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = interaction.guild;

  if (!guild) {
    throw new Error('Guild not found');
  }

  const currentLockdown = lockdownStates.get(guild.id);
  if (!currentLockdown?.enabled) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FFAA00')
      .setTitle('⚠️ Not locked down')
      .setDescription('Server is not currently in lockdown.');

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

  let successCount = 0;
  let failCount = 0;

  // Restore permissions for all locked channels
  for (const channelId of currentLockdown.lockedChannels) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !('permissionOverwrites' in channel)) continue;

    try {
      await (channel as any).permissionOverwrites.delete(guild.roles.everyone);
      successCount++;
    } catch (error) {
      console.error(`Failed to unlock channel ${channelId}:`, error);
      failCount++;
    }
  }

  // Clear lockdown state
  lockdownStates.delete(guild.id);

  const successEmbed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('🔓 Server Lockdown Disabled')
    .addFields(
      {
        name: 'Channels Unlocked',
        value: `${successCount} channel(s)`,
        inline: true,
      },
      {
        name: 'Failed',
        value: `${failCount} channel(s)`,
        inline: true,
      },
      {
        name: 'Duration',
        value: formatDuration(Date.now() - currentLockdown.startedAt),
        inline: true,
      }
    )
    .setTimestamp();

  await interaction.editReply({
    embeds: [successEmbed],
  });

  auditLogger.log({
    action: 'server-lockdown-disable',
    executorId: interaction.user.id,
    executorTag: interaction.user.tag,
    guildId: guild.id,
    guildName: guild.name,
    details: {
      unlockedChannels: successCount,
      duration: Date.now() - currentLockdown.startedAt,
    },
    success: true,
  });
}

async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = interaction.guild;

  if (!guild) {
    throw new Error('Guild not found');
  }

  const lockdown = lockdownStates.get(guild.id);

  if (!lockdown?.enabled) {
    const statusEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🔓 Lockdown Status')
      .setDescription('Server is **not** in lockdown.');

    await interaction.reply({
      embeds: [statusEmbed],
      ephemeral: true,
    });

    return;
  }

  const duration = formatDuration(Date.now() - lockdown.startedAt);
  const lockedChannels = lockdown.lockedChannels.size;

  const statusEmbed = new EmbedBuilder()
    .setColor('#FF6600')
    .setTitle('🔒 Lockdown Status')
    .setDescription('Server **is** in lockdown.')
    .addFields(
      {
        name: 'Enabled By',
        value: `<@${lockdown.enabledBy}>`,
        inline: true,
      },
      {
        name: 'Duration',
        value: duration,
        inline: true,
      },
      {
        name: 'Locked Channels',
        value: `${lockedChannels}`,
        inline: true,
      },
      {
        name: 'Reason',
        value: lockdown.reason,
        inline: false,
      }
    )
    .setTimestamp();

  await interaction.reply({
    embeds: [statusEmbed],
    ephemeral: true,
  });
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
