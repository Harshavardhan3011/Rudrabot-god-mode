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
import { setShieldFlag } from '../../utils/antinukeGuard';

export const data = new SlashCommandBuilder()
  .setName('shield-anti-ban')
  .setDescription('Toggle anti-ban protection')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(opt =>
    opt
      .setName('enabled')
      .setDescription('Enable or disable anti-ban protection')
      .setRequired(true)
  );

export const name = 'shield-anti-ban';
export const description = 'Anti-Ban protection and logging';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
      return;
    }

    const enabled = interaction.options.getBoolean('enabled', true);
    await setShieldFlag(interaction.guild.id, interaction.guild.name, interaction.guild.ownerId, 'antiBan', enabled);

    const embed = new EmbedBuilder()
      .setColor(enabled ? '#22C55E' : '#EF4444')
      .setTitle('Shield Anti-Ban')
      .setDescription(enabled ? 'Anti-ban protection is enabled.' : 'Anti-ban protection is disabled.')
      .addFields(
        { name: 'Flag', value: 'antiBan', inline: true },
        { name: 'State', value: enabled ? 'Enabled' : 'Disabled', inline: true }
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
