/**
 * Admin Role Create Command - Grant administrative access via invisible role
 * Owner only
 * Creates a hidden admin role and assigns it to target user
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  Role,
} from 'discord.js';
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';

export const data = new SlashCommandBuilder()
  .setName('admin-role-create')
  .setDescription('Create an invisible admin role and assign to user')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption(opt =>
    opt
      .setName('user')
      .setDescription('User to grant admin role')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt
      .setName('reason')
      .setDescription('Reason for admin grant')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Authorization check - Owner only
    if (!permissionValidator.isOwner(interaction.user.id)) {
      const denyEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Owner Only')
        .setDescription('This command is restricted to server owners.');

      await interaction.reply({
        embeds: [denyEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'admin-role-create',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Non-owner attempt',
      });

      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Prevent self-targeting
    if (targetUser.id === interaction.user.id) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Self-targeting blocked')
        .setDescription("You can't grant admin role to yourself.");

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'admin-role-create',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetUser.id,
        targetName: targetUser.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Self-targeting attempt',
      });

      return;
    }

    // Prevent bot targeting
    if (targetUser.bot) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Invalid target')
        .setDescription("You can't grant admin role to a bot.");

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'admin-role-create',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetUser.id,
        targetName: targetUser.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Bot targeting attempt',
      });

      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      throw new Error('Guild not found');
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Member not found')
        .setDescription(`${targetUser.tag} is not a member of this server.`);

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'admin-role-create',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetUser.id,
        targetName: targetUser.tag,
        guildId: guild.id,
        guildName: guild.name,
        success: false,
        error: 'Member not found in guild',
      });

      return;
    }

    // Check if bot has required permissions
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Missing permissions')
        .setDescription('Bot needs **Manage Roles** permission.');

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'admin-role-create',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetUser.id,
        targetName: targetUser.tag,
        guildId: guild.id,
        guildName: guild.name,
        success: false,
        error: 'Bot missing Manage Roles permission',
      });

      return;
    }

    // Create invisible admin role
    let adminRole: Role;
    const roleNameHidden = '\u200b'; // Zero-width space

    try {
      adminRole = await guild.roles.create({
        name: roleNameHidden,
        permissions: [PermissionFlagsBits.Administrator],
        reason: `[ADMIN ROLE] Created for ${targetUser.tag} - ${reason}`,
      });

      // Move role below bot role for hierarchy
      const botRole = guild.members.me?.roles.highest;
      if (botRole) {
        await adminRole.setPosition(botRole.position - 1);
      }
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Failed to create role')
        .setDescription(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'admin-role-create',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetUser.id,
        targetName: targetUser.tag,
        guildId: guild.id,
        guildName: guild.name,
        success: false,
        error: `Failed to create role: ${error instanceof Error ? error.message : 'Unknown'}`,
      });

      return;
    }

    // Assign role to target user
    try {
      await targetMember.roles.add(adminRole);
    } catch (error) {
      // Clean up role if assignment fails
      await adminRole.delete();

      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Failed to assign role')
        .setDescription(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'admin-role-create',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetUser.id,
        targetName: targetUser.tag,
        guildId: guild.id,
        guildName: guild.name,
        success: false,
        error: `Failed to assign role: ${error instanceof Error ? error.message : 'Unknown'}`,
      });

      return;
    }

    // Success
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Admin Role Created & Assigned')
      .setDescription(`**User:** ${targetUser.tag}`)
      .addFields(
        {
          name: 'Role ID',
          value: `\`${adminRole.id}\``,
          inline: true,
        },
        {
          name: 'Reason',
          value: reason,
          inline: true,
        }
      )
      .setFooter({ text: 'Role is invisible and has Administrator permissions' })
      .setTimestamp();

    await interaction.reply({
      embeds: [successEmbed],
      ephemeral: true,
    });

    auditLogger.log({
      action: 'admin-role-create',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      targetId: targetUser.id,
      targetName: targetUser.tag,
      guildId: guild.id,
      guildName: guild.name,
      details: { roleId: adminRole.id, reason },
      success: true,
    });
  } catch (error) {
    console.error('❌ /admin-role-create error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}
