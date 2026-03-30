/**
 * SENTINELSCAN - Zalgo Purge
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-zalgo-purge')
  .setDescription('Clears corrupted or glitch text from chat.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const name = 'sentinel-zalgo-purge';
export const description = 'Clears corrupted or glitch text from chat.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Zalgo Purge')
      .setDescription('SentinelScan matrix command 51/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-zalgo-purge', inline: false })
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
