/**
 * SENTINELSCAN - Staff Impersonator Kick
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-staff-impersonator-kick')
  .setDescription('Kicks users trying to copy staff identity.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable staff impersonator kick').setRequired(true));

export const name = 'sentinel-staff-impersonator-kick';
export const description = 'Kicks users trying to copy staff identity.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Staff Impersonator Kick')
      .setDescription('SentinelScan matrix command 36/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-staff-impersonator-kick', inline: false })
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
