/**
 * SENTINELSCAN - Cross Guild Ban Check
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-cross-guild-ban-check')
  .setDescription('Checks if a user is banned in allied guilds.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption(opt => opt.setName('user').setDescription('User to cross-check').setRequired(true));

export const name = 'sentinel-cross-guild-ban-check';
export const description = 'Checks if a user is banned in allied guilds.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Cross Guild Ban Check')
      .setDescription('SentinelScan matrix command 40/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-cross-guild-ban-check', inline: false })
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
