/**
 * MODERATION MATRIX GROUPED COMMAND: /role
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('role')
  .setDescription('Role assignment and role analytics tools.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand(sub => sub
      .setName('give')
      .setDescription('Give role to a user.')
      .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('take')
      .setDescription('Take role from a user.')
      .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('mass-give')
      .setDescription('Give role to everyone in server.')
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('mass-take')
      .setDescription('Take role from everyone in server.')
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('info')
      .setDescription('Show detailed role info.')
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
  );

export const name = 'role';
export const description = 'Role assignment and role analytics tools.';
export const category = 'moderation';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const sub = interaction.options.getSubcommand();
    const embed = new EmbedBuilder()
      .setColor('#F97316')
      .setTitle('Moderation Matrix: /role')
      .setDescription('Executed subcommand: ' + sub)
      .addFields({ name: 'Route', value: '/role ' + sub, inline: false })
      .setFooter({ text: 'RUDRA.0x Moderation & Punishment Matrix' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error executing role command:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Error executing command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Error executing command.', ephemeral: true });
    }
  }
}
