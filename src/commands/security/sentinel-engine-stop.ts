/**
 * SENTINELSCAN - Engine Stop
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-engine-stop')
  .setDescription('Pauses SentinelScan (Owner only).')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const name = 'sentinel-engine-stop';
export const description = 'Pauses SentinelScan (Owner only).';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Engine Stop')
      .setDescription('SentinelScan matrix command 62/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-engine-stop', inline: false })
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
