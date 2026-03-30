/**
 * DM Broadcast Command - Send DMs to server members with rate limiting
 * Owner/VIP only
 * Uses queue system (1 DM/second to avoid rate limits)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';

interface DMQueue {
  guildId: string;
  message: string;
  totalMembers: number;
  successCount: number;
  failCount: number;
  status: 'pending' | 'running' | 'completed';
  startedAt: number;
}

// Store active broadcast queues
const activeBroadcasts = new Map<string, DMQueue>();

export const data = new SlashCommandBuilder()
  .setName('dm-broadcast')
  .setDescription('Broadcast message to all server members (rate-limited)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt =>
    opt
      .setName('message')
      .setDescription('Message to send (max 2000 chars)')
      .setRequired(true)
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
        action: 'dm-broadcast',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Unauthorized attempt',
      });

      return;
    }

    const message = interaction.options.getString('message', true);
    const guild = interaction.guild;

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Check if broadcast already running
    if (activeBroadcasts.has(guild.id)) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FFAA00')
        .setTitle('⚠️ Broadcast already running')
        .setDescription('Wait for the current broadcast to finish.');

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      return;
    }

    // Validate message length
    if (message.length > 2000) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Message too long')
        .setDescription('Message must be 2000 characters or less.');

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      return;
    }

    // Fetch all members
    await guild.members.fetch().catch(() => null);
    const members = guild.members.cache.filter(m => !m.user.bot);
    const totalMembers = members.size;

    if (totalMembers === 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ No members')
        .setDescription('No members to send messages to.');

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      return;
    }

    // Confirmation prompt
    const confirmEmbed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('📢 DM Broadcast Confirmation')
      .setDescription(`Send message to **${totalMembers}** members?`)
      .addFields(
        {
          name: 'Message Preview',
          value: message.length > 100 ? `${message.substring(0, 100)}...` : message,
          inline: false,
        },
        {
          name: 'Recipients',
          value: `${totalMembers} members`,
          inline: true,
        },
        {
          name: 'Rate Limit',
          value: '1 DM/second',
          inline: true,
        }
      )
      .setFooter({ text: 'You have 30 seconds to confirm' });

    const confirmButton = new ButtonBuilder()
      .setCustomId('broadcast_confirm')
      .setLabel('✅ SEND')
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId('broadcast_cancel')
      .setLabel('❌ CANCEL')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

    const replyEmbed = await interaction.reply({
      embeds: [confirmEmbed],
      components: [row],
      ephemeral: true,
    });

    // Await button interaction
    const collector = replyEmbed.createMessageComponentCollector({
      time: 30000,
    });

    collector.on('collect', async buttonInteraction => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        const unAuthEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ Not authorized')
          .setDescription('Only the command executor can confirm.');

        await buttonInteraction.reply({
          embeds: [unAuthEmbed],
          ephemeral: true,
        });

        return;
      }

      if (buttonInteraction.customId === 'broadcast_confirm') {
        // Start broadcast
        const broadcastQueue: DMQueue = {
          guildId: guild.id,
          message,
          totalMembers,
          successCount: 0,
          failCount: 0,
          status: 'running',
          startedAt: Date.now(),
        };

        activeBroadcasts.set(guild.id, broadcastQueue);

        const startEmbed = new EmbedBuilder()
          .setColor('#FF6600')
          .setTitle('📢 Broadcast Started')
          .setDescription(
            `Sending message to ${totalMembers} members. Rate: 1 DM/second.`
          )
          .setFooter({ text: 'This may take several minutes' })
          .setTimestamp();

        await buttonInteraction.update({
          embeds: [startEmbed],
          components: [],
        });

        // Process queue
        let delay = 0;
        for (const member of members.values()) {
          setTimeout(async () => {
            try {
              await member.send(message);
              broadcastQueue.successCount++;
            } catch (error) {
              console.error(`Failed to DM ${member.user.tag}:`, error);
              broadcastQueue.failCount++;
            }
          }, delay);

          delay += 1000; // 1 second between DMs
        }

        // Completion notification
        setTimeout(() => {
          const duration = Date.now() - broadcastQueue.startedAt;
          const minutes = Math.floor(duration / 60000);
          const seconds = Math.floor((duration % 60000) / 1000);

          const completeEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Broadcast Complete')
            .addFields(
              {
                name: 'Sent',
                value: `${broadcastQueue.successCount}/${totalMembers}`,
                inline: true,
              },
              {
                name: 'Failed',
                value: `${broadcastQueue.failCount}`,
                inline: true,
              },
              {
                name: 'Duration',
                value: `${minutes}m ${seconds}s`,
                inline: true,
              }
            )
            .setTimestamp();

          replyEmbed.edit({
            embeds: [completeEmbed],
          });

          activeBroadcasts.delete(guild.id);

          auditLogger.log({
            action: 'dm-broadcast',
            executorId: interaction.user.id,
            executorTag: interaction.user.tag,
            guildId: guild.id,
            guildName: guild.name,
            details: {
              totalMembers,
              successCount: broadcastQueue.successCount,
              failCount: broadcastQueue.failCount,
            },
            success: true,
          });
        }, delay + 1000);
      } else if (buttonInteraction.customId === 'broadcast_cancel') {
        const cancelledEmbed = new EmbedBuilder()
          .setColor('#FFAA00')
          .setTitle('⏹️ Broadcast Cancelled')
          .setDescription('No messages were sent.');

        await buttonInteraction.update({
          embeds: [cancelledEmbed],
          components: [],
        });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        // Timeout
        const timeoutEmbed = new EmbedBuilder()
          .setColor('#FFAA00')
          .setTitle('⏱️ Confirmation Timeout')
          .setDescription('Broadcast was not confirmed. No messages sent.');

        replyEmbed.edit({
          embeds: [timeoutEmbed],
          components: [],
        });
      }
    });
  } catch (error) {
    console.error('❌ /dm-broadcast error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}
