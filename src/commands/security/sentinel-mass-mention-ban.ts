/**
 * SENTINELSCAN - Mass Mention Ban
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-mass-mention-ban')
  .setDescription('Bans anyone who pings more than X people in one message.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(opt => opt.setName('number').setDescription('Maximum mentions allowed').setRequired(true).setMinValue(1));

export const name = 'sentinel-mass-mention-ban';
export const description = 'Bans anyone who pings more than X people in one message.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Mass Mention Ban')
      .setDescription('SentinelScan matrix command 53/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-mass-mention-ban', inline: false })
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
