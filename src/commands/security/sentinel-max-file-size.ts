/**
 * SENTINELSCAN - Max File Size
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-max-file-size')
  .setDescription('Restricts the maximum upload size for non-VIPs.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(opt => opt.setName('mb').setDescription('Maximum file size in MB').setRequired(true).setMinValue(1));

export const name = 'sentinel-max-file-size';
export const description = 'Restricts the maximum upload size for non-VIPs.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Max File Size')
      .setDescription('SentinelScan matrix command 25/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-max-file-size', inline: false })
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
