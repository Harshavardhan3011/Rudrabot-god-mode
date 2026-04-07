/**
 * ANTI-BOT-ADD - Security Command #3
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { setShieldFlag } from '../../utils/antinukeGuard';

export const data = new SlashCommandBuilder()
  .setName('shield-anti-bot-add')
  .setDescription('Toggle anti-bot-add protection')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enable or disable').setRequired(true));

export const name = 'shield-anti-bot-add';
export const description = 'Toggle anti-bot-add protection';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
      return;
    }

    const enabled = interaction.options.getBoolean('enabled', true);
    await setShieldFlag(interaction.guild.id, interaction.guild.name, interaction.guild.ownerId, 'antiBotAdd', enabled);

    const embed = new EmbedBuilder()
      .setColor(enabled ? '#22C55E' : '#EF4444')
      .setTitle('Shield Anti-Bot Add')
      .setDescription(enabled ? 'Bot-add protection is enabled.' : 'Bot-add protection is disabled.')
      .addFields(
        { name: 'Flag', value: 'antiBotAdd', inline: true },
        { name: 'State', value: enabled ? 'Enabled' : 'Disabled', inline: true }
      )
      .setFooter({ text: 'RUDRA.0x Security Module 2' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in shield anti-bot-add:', error);
    await interaction.reply({ content: '❌ Error executing command', ephemeral: true });
  }
}