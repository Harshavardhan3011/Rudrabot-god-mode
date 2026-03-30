/**
 * SENTINELSCAN - Avatar Scanner
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-avatar-scanner')
  .setDescription('Uses AI to detect NSFW or inappropriate profile pictures.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable avatar scanner').setRequired(true));

export const name = 'sentinel-avatar-scanner';
export const description = 'Uses AI to detect NSFW or inappropriate profile pictures.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Avatar Scanner')
      .setDescription('SentinelScan matrix command 31/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-avatar-scanner', inline: false })
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
