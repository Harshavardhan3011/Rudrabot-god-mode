/**
 * SENTINELSCAN - Name Filter Add
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-name-filter-add')
  .setDescription('Auto-kicks users with this word in their name.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt => opt.setName('word').setDescription('Word to block in usernames').setRequired(true));

export const name = 'sentinel-name-filter-add';
export const description = 'Auto-kicks users with this word in their name.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Name Filter Add')
      .setDescription('SentinelScan matrix command 32/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-name-filter-add', inline: false })
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
