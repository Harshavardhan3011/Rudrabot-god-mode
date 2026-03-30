import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { AccessLevel, checkAccess } from '../../utils/accessControl';
import { getOrCreateGuildData, saveGuildData } from '../../database/guildSecurityMatrix';

export const data = new SlashCommandBuilder()
  .setName('antibot')
  .setDescription('Master toggle for anti-bot join gate strict mode')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt =>
    opt
      .setName('mode')
      .setDescription('Turn anti-bot gate on or off')
      .setRequired(true)
      .addChoices(
        { name: 'on', value: 'on' },
        { name: 'off', value: 'off' }
      )
  );

export const name = 'antibot';
export const description = 'Master anti-bot gate toggle';
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
  guildData.modules.antinuke = enabled || guildData.modules.antinuke;
  guildData.antinuke = {
    ...(guildData.antinuke || {}),
    antiBotAdd: enabled,
  };
  guildData.antibot = {
    enabled,
    strictMode: enabled,
    updatedBy: interaction.user.id,
    updatedAt: Date.now(),
  };

  const saved = await saveGuildData(interaction.guild.id, guildData);
  if (!saved) {
    await interaction.reply({ content: 'Failed to update anti-bot gate.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(enabled ? '#22C55E' : '#EF4444')
    .setTitle('AntiBot Master Toggle')
    .setDescription(`Anti-bot join gate strict mode is now **${enabled ? 'ON' : 'OFF'}**.`)
    .addFields(
      { name: 'Guild', value: interaction.guild.name, inline: true },
      { name: 'Mode', value: enabled ? 'ON' : 'OFF', inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
