/**
 * Shield Anti-Kick Command - Security Module 2 - Command 2
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { setShieldFlag } from '../../utils/antinukeGuard';

export const data = new SlashCommandBuilder()
  .setName('shield-anti-kick')
  .setDescription('Toggle anti-kick protection')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable protection').setRequired(true));

export const name = 'shield-anti-kick';
export const description = 'Anti-Kick protection and logging';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
      return;
    }

    const enabled = interaction.options.getBoolean('enabled', true);
    await setShieldFlag(interaction.guild.id, interaction.guild.name, interaction.guild.ownerId, 'antiKick', enabled);

    const embed = new EmbedBuilder()
      .setColor(enabled ? '#22C55E' : '#EF4444')
      .setTitle('Shield Anti-Kick')
      .setDescription(enabled ? 'Anti-kick protection is enabled.' : 'Anti-kick protection is disabled.')
      .addFields(
        { name: 'Flag', value: 'antiKick', inline: true },
        { name: 'State', value: enabled ? 'Enabled' : 'Disabled', inline: true }
      )
      .setFooter({ text: 'RUDRA.0x Security Module' })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in shield anti-kick:', error);
    await interaction.reply({ content: '❌ Error executing command', ephemeral: true });
  }
}
