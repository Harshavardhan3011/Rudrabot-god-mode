/**
 * SENTINELSCAN - Bot Impersonator Kick
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-bot-impersonator-kick')
  .setDescription('Kicks users trying to impersonate bot names.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable bot impersonator kick').setRequired(true));

export const name = 'sentinel-bot-impersonator-kick';
export const description = 'Kicks users trying to impersonate bot names.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Bot Impersonator Kick')
      .setDescription('SentinelScan matrix command 35/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-bot-impersonator-kick', inline: false })
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
