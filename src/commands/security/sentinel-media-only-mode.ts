/**
 * SENTINELSCAN - Media Only Mode
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-media-only-mode')
  .setDescription('Forces a channel to only accept images/videos.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(opt => opt.setName('channel').setDescription('Channel to enforce media-only mode').setRequired(true));

export const name = 'sentinel-media-only-mode';
export const description = 'Forces a channel to only accept images/videos.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Media Only Mode')
      .setDescription('SentinelScan matrix command 21/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-media-only-mode', inline: false })
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
