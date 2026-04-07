import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  Role,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types";
import runtimeConfigStore from "../../database/runtimeConfigStore";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("autorole-add")
    .setDescription("Add a role to the autorole assignment list")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addRoleOption((option) =>
      option.setName("role").setDescription("Role to auto-assign").setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("apply_existing")
        .setDescription("Also assign this role to current non-bot members")
        .setRequired(false)
    ),
  name: "autorole-add",
  description: "Add autorole rule",
  category: "gateway",
  module: "gateway",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
        return;
      }

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.reply({ content: "❌ You need Manage Roles permission.", ephemeral: true });
        return;
      }

      const botMember = interaction.guild.members.me;
      if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.reply({ content: "❌ Bot needs Manage Roles permission.", ephemeral: true });
        return;
      }

      const roleValue = interaction.options.getRole("role", true);
      if (!(roleValue instanceof Role)) {
        await interaction.reply({ content: "❌ Invalid role provided.", ephemeral: true });
        return;
      }
      const role = roleValue;
      const applyExisting = interaction.options.getBoolean("apply_existing") ?? false;

      if (role.managed) {
        await interaction.reply({ content: "❌ Managed/integration roles cannot be used for autorole.", ephemeral: true });
        return;
      }

      if (botMember.roles.highest.position <= role.position) {
        await interaction.reply({ content: "❌ I cannot assign this role due to role hierarchy.", ephemeral: true });
        return;
      }

      const config = runtimeConfigStore.getGatewayConfig(interaction.guild.id);
      const roleIds = new Set(config.autoroleRoleIds || []);
      roleIds.add(role.id);
      config.autoroleRoleIds = Array.from(roleIds);
      runtimeConfigStore.setGatewayConfig(interaction.guild.id, config);

      let assigned = 0;
      if (applyExisting) {
        await interaction.guild.members.fetch();
        for (const [, member] of interaction.guild.members.cache) {
          if (member.user.bot || member.roles.cache.has(role.id)) continue;
          if (member.manageable || member.id === interaction.guild.ownerId) {
            await member.roles.add(role.id).then(() => {
              assigned++;
            }).catch(() => null);
          }
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("✅ Autorole Updated")
        .addFields(
          { name: "Role", value: `<@&${role.id}>`, inline: true },
          { name: "Apply Existing", value: applyExisting ? "Yes" : "No", inline: true },
          { name: "Members Updated", value: String(assigned), inline: true }
        )
        .setFooter({ text: `Total autoroles: ${config.autoroleRoleIds.length}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error("Error in /autorole-add:", error);
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ Failed to configure autorole.", ephemeral: true });
      }
    }
  },
};

export default command;

