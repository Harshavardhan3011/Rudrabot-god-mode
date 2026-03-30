import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { AccessLevel, checkAccess } from '../../utils/accessControl';
import { getOrCreateGuildData, saveGuildData } from '../../database/guildSecurityMatrix';

export const data = new SlashCommandBuilder()
  .setName('automod')
  .setDescription('Master toggle for all automated moderation rules')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt =>
    opt
      .setName('mode')
      .setDescription('Turn automod on or off')
      .setRequired(true)
      .addChoices(
        { name: 'on', value: 'on' },
        { name: 'off', value: 'off' }
      )
  );

export const name = 'automod';
export const description = 'Master automod toggle';
export const category = 'owner';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  if (!checkAccess(interaction.user.id, AccessLevel.VIP)) {
    await interaction.reply({ content: 'Access denied. Requires VIP level or higher.', ephemeral: true });
    return;
  }

  const mode = interaction.options.getString('mode', true);
  const enabled = mode === 'on';

  const guildData = await getOrCreateGuildData(
    interaction.guild.id,
    interaction.guild.name,
    interaction.guild.ownerId
  );

  guildData.modules = guildData.modules || {};
  guildData.modules.moderation = enabled;
  guildData.moderation = {
    ...(guildData.moderation || {}),
    automodEnabled: enabled,
    profanityFilter: enabled,
    linkFilter: enabled,
    nsfwImageScan: enabled,
    zalgoFilter: enabled,
    spamThreshold: guildData.moderation?.spamThreshold ?? 5,
    automuteTime: guildData.moderation?.automuteTime ?? 60,
  };

  const saved = await saveGuildData(interaction.guild.id, guildData);
  if (!saved) {
    await interaction.reply({ content: 'Failed to update automod matrix.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(enabled ? '#22C55E' : '#EF4444')
    .setTitle('Automod Master Toggle')
    .setDescription(`Automated moderation rules are now **${enabled ? 'ON' : 'OFF'}**.`)
    .addFields(
      { name: 'Guild', value: interaction.guild.name, inline: true },
      { name: 'Mode', value: enabled ? 'ON' : 'OFF', inline: true },
      { name: 'Rules', value: 'anti-spam, anti-link, word filters, NSFW scan, zalgo filter', inline: false }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
