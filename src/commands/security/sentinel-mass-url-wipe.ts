/**
 * SENTINELSCAN - Mass Url Wipe
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-mass-url-wipe')
  .setDescription('Deletes all messages containing links in the last X messages.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(opt => opt.setName('amount').setDescription('How many recent messages to scan').setRequired(true).setMinValue(1));

export const name = 'sentinel-mass-url-wipe';
export const description = 'Deletes all messages containing links in the last X messages.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Mass Url Wipe')
      .setDescription('SentinelScan matrix command 9/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-mass-url-wipe', inline: false })
      .setFooter({ text: 'RUDRA.0x SentinelScan Matrix' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error executing sentinel command:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Error executing command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Error executing command.', ephemeral: true });
    }
  }
}
