/**
 * MODERATION MATRIX GROUPED COMMAND: /modrole
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('modrole')
  .setDescription('Moderator role access controls.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Grant moderation command access to a role.')
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove moderation command access from a role.')
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List roles with moderation access.')
  )
  .addSubcommand(sub => sub
      .setName('restrict-command')
      .setDescription('Restrict a command for a role.')
      .addStringOption(opt => opt.setName('command').setDescription('Command name').setRequired(true))
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('allow-command')
      .setDescription('Allow a command for a role.')
      .addStringOption(opt => opt.setName('command').setDescription('Command name').setRequired(true))
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
  );

export const name = 'modrole';
export const description = 'Moderator role access controls.';
export const category = 'moderation';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const sub = interaction.options.getSubcommand();
    const embed = new EmbedBuilder()
      .setColor('#F97316')
      .setTitle('Moderation Matrix: /modrole')
      .setDescription('Executed subcommand: ' + sub)
      .addFields({ name: 'Route', value: '/modrole ' + sub, inline: false })
      .setFooter({ text: 'RUDRA.0x Moderation & Punishment Matrix' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error executing modrole command:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Error executing command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Error executing command.', ephemeral: true });
    }
  }
}
