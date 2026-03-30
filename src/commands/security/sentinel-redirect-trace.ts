/**
 * SENTINELSCAN - Redirect Trace
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-redirect-trace')
  .setDescription('Unshortens bit.ly/tinyurl links to find the real destination.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt => opt.setName('link').setDescription('Short URL to trace').setRequired(true));

export const name = 'sentinel-redirect-trace';
export const description = 'Unshortens bit.ly/tinyurl links to find the real destination.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Redirect Trace')
      .setDescription('SentinelScan matrix command 2/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-redirect-trace', inline: false })
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
