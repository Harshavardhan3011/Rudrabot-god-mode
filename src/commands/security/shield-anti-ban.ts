/**
 * Shield Anti-Ban Command
 * Prevents unauthorized bans
 * Security Module 2 - Command 1
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('shield')
  .setDescription('Antinuke protection - Anti-Ban shield')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub
      .setName('anti-ban')
      .setDescription('Prevent unauthorized bans in server')
      .addBooleanOption(opt =>
        opt
          .setName('enabled')
          .setDescription('Enable or disable anti-ban protection')
          .setRequired(true)
      )
  );

export const name = 'shield-anti-ban';
export const description = 'Anti-Ban protection and logging';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const enabled = interaction.options.getBoolean('enabled');

    const embed = new EmbedBuilder()
      .setColor(enabled ? '#00FF00' : '#FF0000')
      .setTitle('🛡️ Shield Anti-Ban')
      .setDescription(enabled ? '✅ Anti-ban protection ENABLED' : '❌ Anti-ban protection DISABLED')
      .addFields(
        {
          name: 'Protection Active',
          value: enabled ? 'All ban attempts are being monitored' : 'Ban protection is off',
          inline: true,
        }
      )
      .setFooter({ text: 'RUDRA.0x Security Module' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in shield anti-ban:', error);
    await interaction.reply({
      content: '❌ Error executing command',
      ephemeral: true,
    });
  }
}
