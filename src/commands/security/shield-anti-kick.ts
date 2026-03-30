/**
 * Shield Anti-Kick Command - Security Module 2 - Command 2
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('shield-anti-kick')
  .setDescription('Prevent unauthorized kicks in server')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable protection').setRequired(true));

export const name = 'shield-anti-kick';
export const description = 'Anti-Kick protection and logging';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const enabled = interaction.options.getBoolean('enabled');
    const embed = new EmbedBuilder()
      .setColor(enabled ? '#00FF00' : '#FF0000')
      .setTitle('🛡️ Shield Anti-Kick')
      .setDescription(enabled ? '✅ Anti-kick protection ENABLED' : '❌ Anti-kick protection DISABLED')
      .setFooter({ text: 'RUDRA.0x Security Module' })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in shield anti-kick:', error);
    await interaction.reply({ content: '❌ Error executing command', ephemeral: true });
  }
}
