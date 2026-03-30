/**
 * SENTINELSCAN - Nitro Scam Filter
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-nitro-scam-filter')
  .setDescription('Blocks fake Free Discord Nitro links.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable Nitro scam filter').setRequired(true));

export const name = 'sentinel-nitro-scam-filter';
export const description = 'Blocks fake Free Discord Nitro links.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Nitro Scam Filter')
      .setDescription('SentinelScan matrix command 6/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-nitro-scam-filter', inline: false })
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
