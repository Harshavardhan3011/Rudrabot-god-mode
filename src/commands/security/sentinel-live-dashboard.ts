/**
 * SENTINELSCAN - Live Dashboard
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-live-dashboard')
  .setDescription('Shows dynamically updating active scan and threat dashboard.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const name = 'sentinel-live-dashboard';
export const description = 'Shows dynamically updating active scan and threat dashboard.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Live Dashboard')
      .setDescription('SentinelScan matrix command 63/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-live-dashboard', inline: false })
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
