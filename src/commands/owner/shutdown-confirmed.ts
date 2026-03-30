/**
 * Shutdown Confirmed Command - Graceful bot shutdown with double confirmation
 * Owner only
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';

export const data = new SlashCommandBuilder()
  .setName('shutdown-confirmed')
  .setDescription('Graceful bot shutdown (requires double confirmation)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

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
        action: 'shutdown-confirmed',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Non-owner attempt',
      });

      return;
    }

    const confirmEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('⚠️ Bot Shutdown Confirmation')
      .setDescription(
        '**This will shut down the bot immediately.** All ongoing operations will be gracefully terminated.'
      )
      .addFields(
        {
          name: '⚠️ Warning',
          value:
            '• All voice connections will end\n• All timers will be cancelled\n• Database will be saved\n• Your server will be offline',
          inline: false,
        },
        {
          name: '🔐 Executor',
          value: `${interaction.user.tag} (${interaction.user.id})`,
          inline: false,
        }
      )
      .setFooter({ text: 'Click CONFIRM to proceed. You have 30 seconds.' })
      .setTimestamp();

    const confirmButton = new ButtonBuilder()
      .setCustomId('shutdown_confirm_yes')
      .setLabel('✅ CONFIRM SHUTDOWN')
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId('shutdown_confirm_cancel')
      .setLabel('❌ CANCEL')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

    const replyEmbed = await interaction.reply({
      embeds: [confirmEmbed],
      components: [row],
      ephemeral: true,
    });

    // Await button clicks
    const collector = replyEmbed.createMessageComponentCollector({
      time: 30000, // 30 second timeout
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
      // Only allow the command executor to click
      if (buttonInteraction.user.id !== interaction.user.id) {
        const unauthorizedEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ Not authorized')
          .setDescription('Only the command executor can confirm.');

        await buttonInteraction.reply({
          embeds: [unauthorizedEmbed],
          ephemeral: true,
        });

        return;
      }

      if (buttonInteraction.customId === 'shutdown_confirm_yes') {
        // FINAL CONFIRMATION NEEDED
        const finalEmbed = new EmbedBuilder()
          .setColor('#CC0000')
          .setTitle('⚠️ FINAL CONFIRMATION REQUIRED')
          .setDescription('Click **FINAL CONFIRM** to shut down the bot. This cannot be undone.')
          .setFooter({ text: 'You have 15 seconds.' })
          .setTimestamp();

        const finalButton = new ButtonBuilder()
          .setCustomId('shutdown_final_confirm')
          .setLabel('🛑 FINAL CONFIRM')
          .setStyle(ButtonStyle.Danger);

        const cancelButton2 = new ButtonBuilder()
          .setCustomId('shutdown_final_cancel')
          .setLabel('❌ CANCEL')
          .setStyle(ButtonStyle.Secondary);

        const finalRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          finalButton,
          cancelButton2
        );

        await buttonInteraction.update({
          embeds: [finalEmbed],
          components: [finalRow],
        });

        // Create new collector for final confirmation
        const finalCollector = replyEmbed.createMessageComponentCollector({
          time: 15000, // 15 second timeout
        });

        finalCollector.on('collect', async (finalButtonInteraction: ButtonInteraction) => {
          if (finalButtonInteraction.user.id !== interaction.user.id) {
            return;
          }

          if (finalButtonInteraction.customId === 'shutdown_final_confirm') {
            const shutdownEmbed = new EmbedBuilder()
              .setColor('#FF6600')
              .setTitle('🛑 Shutting Down...')
              .setDescription('Bot is shutting down gracefully. See you later!')
              .setFooter({ text: 'Timestamp: ' + new Date().toLocaleString() });

            await finalButtonInteraction.update({
              embeds: [shutdownEmbed],
              components: [],
            });

            // Log the shutdown
            auditLogger.log({
              action: 'shutdown-confirmed',
              executorId: interaction.user.id,
              executorTag: interaction.user.tag,
              guildId: interaction.guildId!,
              guildName: interaction.guild?.name,
              success: true,
            });

            console.log(`🛑 Shutdown initiated by ${interaction.user.tag}`);

            // Give time to see the message, then exit
            setTimeout(() => {
              process.exit(0);
            }, 2000);
          } else if (finalButtonInteraction.customId === 'shutdown_final_cancel') {
            const cancelledEmbed = new EmbedBuilder()
              .setColor('#00FF00')
              .setTitle('✅ Shutdown Cancelled')
              .setDescription('Bot shutdown has been cancelled.');

            await finalButtonInteraction.update({
              embeds: [cancelledEmbed],
              components: [],
            });

            auditLogger.log({
              action: 'shutdown-confirmed',
              executorId: interaction.user.id,
              executorTag: interaction.user.tag,
              guildId: interaction.guildId!,
              guildName: interaction.guild?.name,
              success: false,
              error: 'Cancelled at final confirmation',
            });
          }
        });

        finalCollector.on('end', collected => {
          if (collected.size === 0) {
            // Timeout - no response
            const timeoutEmbed = new EmbedBuilder()
              .setColor('#FFAA00')
              .setTitle('⏱️ Confirmation Timeout')
              .setDescription('Final confirmation timed out. Shutdown cancelled.');

            replyEmbed.edit({
              embeds: [timeoutEmbed],
              components: [],
            });

            auditLogger.log({
              action: 'shutdown-confirmed',
              executorId: interaction.user.id,
              executorTag: interaction.user.tag,
              guildId: interaction.guildId!,
              guildName: interaction.guild?.name,
              success: false,
              error: 'Timed out at final confirmation',
            });
          }
        });
      } else if (buttonInteraction.customId === 'shutdown_confirm_cancel') {
        const cancelledEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('✅ Shutdown Cancelled')
          .setDescription('Bot shutdown has been cancelled.');

        await buttonInteraction.update({
          embeds: [cancelledEmbed],
          components: [],
        });

        auditLogger.log({
          action: 'shutdown-confirmed',
          executorId: interaction.user.id,
          executorTag: interaction.user.tag,
          guildId: interaction.guildId!,
          guildName: interaction.guild?.name,
          success: false,
          error: 'Cancelled at initial confirmation',
        });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        // Timeout - no response
        const timeoutEmbed = new EmbedBuilder()
          .setColor('#FFAA00')
          .setTitle('⏱️ Confirmation Timeout')
          .setDescription('Confirmation timed out. Shutdown cancelled.');

        replyEmbed.edit({
          embeds: [timeoutEmbed],
          components: [],
        });

        auditLogger.log({
          action: 'shutdown-confirmed',
          executorId: interaction.user.id,
          executorTag: interaction.user.tag,
          guildId: interaction.guildId!,
          guildName: interaction.guild?.name,
          success: false,
          error: 'Timed out at initial confirmation',
        });
      }
    });
  } catch (error) {
    console.error('❌ /shutdown-confirmed error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}
