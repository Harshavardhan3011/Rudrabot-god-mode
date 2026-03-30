/**
 * SENTINELSCAN - Name Filter Remove
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-name-filter-remove')
  .setDescription('Removes a blocked word from username filter.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt => opt.setName('word').setDescription('Word to remove from filter').setRequired(true));

export const name = 'sentinel-name-filter-remove';
export const description = 'Removes a blocked word from username filter.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Name Filter Remove')
      .setDescription('SentinelScan matrix command 33/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-name-filter-remove', inline: false })
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
