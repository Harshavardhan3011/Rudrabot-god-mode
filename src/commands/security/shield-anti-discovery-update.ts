/**
 * ANTI-DISCOVERY-UPDATE - Security Command #35
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { setShieldFlag } from '../../utils/antinukeGuard';

export const data = new SlashCommandBuilder()
  .setName('shield-anti-discovery-update')
  .setDescription('Prevent discovery changes')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(false));

export const name = 'shield-anti-discovery-update';
export const description = 'Prevent discovery changes';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
      return;
    }

    const enabled = interaction.options.getBoolean('enabled', true);
    await setShieldFlag(interaction.guild.id, interaction.guild.name, interaction.guild.ownerId, 'antiDiscoveryUpdate', enabled);

    const embed = new EmbedBuilder()
      .setColor(enabled ? '#22C55E' : '#EF4444')
      .setTitle('Shield Anti-Discovery-Update')
      .setDescription(enabled ? 'Discovery update protection is enabled.' : 'Discovery update protection is disabled.')
      .addFields(
        { name: 'Flag', value: 'antiDiscoveryUpdate', inline: true },
        { name: 'State', value: enabled ? 'Enabled' : 'Disabled', inline: true }
      )
      .setFooter({ text: 'RUDRA.0x Security Module' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error executing command:', error);
    await interaction.reply({ content: '❌ Error executing command', ephemeral: true });
  }
}
