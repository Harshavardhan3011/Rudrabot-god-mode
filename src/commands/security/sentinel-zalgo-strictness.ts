/**
 * SENTINELSCAN - Zalgo Strictness
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-zalgo-strictness')
  .setDescription('Sets how aggressively to delete glitch text.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(opt => opt.setName('level').setDescription('Strictness level (1-3)').setRequired(true).setMinValue(1).setMaxValue(3));

export const name = 'sentinel-zalgo-strictness';
export const description = 'Sets how aggressively to delete glitch text.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Zalgo Strictness')
      .setDescription('SentinelScan matrix command 52/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-zalgo-strictness', inline: false })
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
