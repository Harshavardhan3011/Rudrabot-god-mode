/**
 * ANTI-VC TOGGLE COMMAND - Admin Control
 * Toggle anti-vc-join and anti-vc-leave separately
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { getOrCreateGuildData, saveGuildData } from '../../database/guildSecurityMatrix';

export const data = new SlashCommandBuilder()
  .setName('antivc')
  .setDescription('Toggle Anti-VC protections (admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((opt) =>
    opt
      .setName('feature')
      .setDescription('Which anti-VC feature to toggle')
      .setRequired(true)
      .addChoices(
        { name: 'Anti-VC Join', value: 'antiVcJoin' },
        { name: 'Anti-VC Leave', value: 'antiVcLeave' }
      )
  )
  .addStringOption((opt) =>
    opt
      .setName('state')
      .setDescription('Turn on or off')
      .setRequired(true)
      .addChoices(
        { name: 'ON', value: 'on' },
        { name: 'OFF', value: 'off' }
      )
  );

export const name = 'antivc';
export const description = 'Toggle Anti-VC features';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Check admin permissions
    const memberPermissions = interaction.member?.permissions;
    if (!memberPermissions || typeof memberPermissions === 'string' || !('has' in memberPermissions)) {
      await interaction.reply({
        content: '❌ You need Administrator permissions to use this command.',
        ephemeral: true,
      });
      return;
    }
    
    if (!memberPermissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: '❌ You need Administrator permissions to use this command.',
        ephemeral: true,
      });
      return;
    }

    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const feature = interaction.options.getString('feature', true);
    const state = interaction.options.getString('state', true) === 'on';

    const guildData = await getOrCreateGuildData(
      interaction.guild.id,
      interaction.guild.name,
      interaction.guild.ownerId
    );

    // Initialize antiVC toggles if not present
    if (!guildData.antiVcToggles) {
      guildData.antiVcToggles = {
        antiVcJoin: false,
        antiVcLeave: false,
      };
    }

    // Update the appropriate toggle
    (guildData.antiVcToggles as any)[feature] = state;

    // Save to database
    const saved = await saveGuildData(interaction.guild.id, guildData);
    if (!saved) {
      await interaction.editReply('❌ Failed to save to database.').catch(() => null);
      return;
    }

    const featureName = feature === 'antiVcJoin' ? 'Anti-VC Join' : 'Anti-VC Leave';
    const status = state ? '✅ ENABLED' : '❌ DISABLED';

    const embed = new EmbedBuilder()
      .setColor(state ? '#22C55E' : '#EF4444')
      .setTitle('🔊 Anti-VC Toggle Updated')
      .setDescription(`**${featureName}** is now ${status}`)
      .addFields(
        { name: 'Feature', value: featureName, inline: true },
        { name: 'Status', value: state ? 'Enabled' : 'Disabled', inline: true },
        {
          name: 'Server Info',
          value: `Guild: ${interaction.guild.name}\nUpdated By: ${interaction.user.tag}`,
          inline: false,
        }
      )
      .setFooter({ text: 'RUDRA.0x Anti-VC Manager' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error('Error in antivc command:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('❌ An error occurred.').catch(() => null);
    } else {
      await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => null);
    }
  }
}
