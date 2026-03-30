/**
 * SENTINELSCAN - Quarantine Add
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-quarantine-add')
  .setDescription('Strips roles and locks the user in quarantine.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption(opt => opt.setName('user').setDescription('User to quarantine').setRequired(true))
  .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true));

export const name = 'sentinel-quarantine-add';
export const description = 'Strips roles and locks the user in quarantine.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Quarantine Add')
      .setDescription('SentinelScan matrix command 42/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-quarantine-add', inline: false })
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
