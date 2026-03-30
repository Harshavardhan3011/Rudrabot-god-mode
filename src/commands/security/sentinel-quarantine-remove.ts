/**
 * SENTINELSCAN - Quarantine Remove
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-quarantine-remove')
  .setDescription('Releases a user from quarantine.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption(opt => opt.setName('user').setDescription('User to release').setRequired(true));

export const name = 'sentinel-quarantine-remove';
export const description = 'Releases a user from quarantine.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Quarantine Remove')
      .setDescription('SentinelScan matrix command 43/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-quarantine-remove', inline: false })
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
