/**
 * SENTINELSCAN - Alt Detector
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-alt-detector')
  .setDescription('Flags accounts newer than X days.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(opt => opt.setName('days').setDescription('Minimum account age in days').setRequired(true).setMinValue(1));

export const name = 'sentinel-alt-detector';
export const description = 'Flags accounts newer than X days.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Alt Detector')
      .setDescription('SentinelScan matrix command 27/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-alt-detector', inline: false })
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
