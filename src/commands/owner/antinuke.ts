import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { AccessLevel, checkAccess } from '../../utils/accessControl';
import { buildAntiNukeMatrix, getOrCreateGuildData, saveGuildData, ANTI_NUKE_FLAG_KEYS } from '../../database/guildSecurityMatrix';

export const data = new SlashCommandBuilder()
  .setName('antinuke')
  .setDescription('Master toggle for all antinuke security flags')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt =>
    opt
      .setName('mode')
      .setDescription('Turn antinuke on or off')
      .setRequired(true)
      .addChoices(
        { name: 'on', value: 'on' },
        { name: 'off', value: 'off' }
      )
  );

export const name = 'antinuke';
export const description = 'Master antinuke toggle';
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
  guildData.modules.antinuke = enabled;
  guildData.antinuke = {
    ...(guildData.antinuke || {}),
    ...buildAntiNukeMatrix(enabled),
  };

  const saved = await saveGuildData(interaction.guild.id, guildData);
  if (!saved) {
    await interaction.reply({ content: 'Failed to update antinuke matrix.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(enabled ? '#22C55E' : '#EF4444')
    .setTitle('Antinuke Master Toggle')
    .setDescription(`All ${ANTI_NUKE_FLAG_KEYS.length} security flags are now **${enabled ? 'ON' : 'OFF'}**.`)
    .addFields(
      { name: 'Guild', value: interaction.guild.name, inline: true },
      { name: 'Mode', value: enabled ? 'ON' : 'OFF', inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
