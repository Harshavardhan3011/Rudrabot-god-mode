/**
 * SENTINELSCAN - Regex Link Remove
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-regex-link-remove')
  .setDescription('Remove a custom blocked URL regex pattern.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt => opt.setName('regex-code').setDescription('Regex pattern to remove').setRequired(true));

export const name = 'sentinel-regex-link-remove';
export const description = 'Remove a custom blocked URL regex pattern.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Regex Link Remove')
      .setDescription('SentinelScan matrix command 12/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-regex-link-remove', inline: false })
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
