/**
 * THREAT-INTEL-SEARCH - Security Command #83
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('threat-intel-search')
  .setDescription('Search user in ban databases')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(false));

export const name = 'threat-intel-search';
export const description = 'Search user in ban databases';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🛡️ Threat intel search')
      .setDescription('Security command #83')
      .addFields(
        { name: 'Status', value: 'Configured', inline: true }
      )
      .setFooter({ text: 'RUDRA.0x Security Module 2' })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error executing command:', error);
    await interaction.reply({ content: '❌ Error executing command', ephemeral: true });
  }
}
