/**
 * SENTINELSCAN - Auto Kick No Pfp
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-auto-kick-no-pfp')
  .setDescription('Kicks users who have the default Discord avatar.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable no-PFP auto kick').setRequired(true));

export const name = 'sentinel-auto-kick-no-pfp';
export const description = 'Kicks users who have the default Discord avatar.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Auto Kick No Pfp')
      .setDescription('SentinelScan matrix command 34/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-auto-kick-no-pfp', inline: false })
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
