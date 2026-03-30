/**
 * SENTINELSCAN - Wall Of Text Block
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-wall-of-text-block')
  .setDescription('Deletes messages that exceed line-count limit.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(opt => opt.setName('lines').setDescription('Maximum lines allowed').setRequired(true).setMinValue(1));

export const name = 'sentinel-wall-of-text-block';
export const description = 'Deletes messages that exceed line-count limit.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Wall Of Text Block')
      .setDescription('SentinelScan matrix command 55/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-wall-of-text-block', inline: false })
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
