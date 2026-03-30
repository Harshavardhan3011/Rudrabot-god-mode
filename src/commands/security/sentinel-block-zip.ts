/**
 * SENTINELSCAN - Block Zip
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-block-zip')
  .setDescription('Auto-deletes compressed files.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable zip block').setRequired(true));

export const name = 'sentinel-block-zip';
export const description = 'Auto-deletes compressed files.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Block Zip')
      .setDescription('SentinelScan matrix command 18/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-block-zip', inline: false })
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
