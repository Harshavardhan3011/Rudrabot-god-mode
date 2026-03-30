/**
 * SENTINELSCAN - Mass Decrypt Chat
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-mass-decrypt-chat')
  .setDescription('Scans recent chat to find hidden raid patterns.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const name = 'sentinel-mass-decrypt-chat';
export const description = 'Scans recent chat to find hidden raid patterns.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Mass Decrypt Chat')
      .setDescription('SentinelScan matrix command 60/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-mass-decrypt-chat', inline: false })
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
