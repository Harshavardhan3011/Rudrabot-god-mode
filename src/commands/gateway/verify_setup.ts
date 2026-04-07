import {
  ChatInputCommandInteraction,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  Role,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { Command } from "../../types";
import runtimeConfigStore from "../../database/runtimeConfigStore";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("verify-setup")
    .setDescription("Create verification message and save verification settings")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Verification channel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Role to grant after verification")
        .setRequired(true)
    ),
  name: "verify-setup",
  description: "Setup verification system",
  category: "gateway",
  module: "gateway",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
        return;
      }

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: "❌ You need Manage Server permission.", ephemeral: true });
        return;
      }

      const channelValue = interaction.options.getChannel("channel", true);
      const roleValue = interaction.options.getRole("role", true);

      if (!(channelValue instanceof TextChannel)) {
        await interaction.reply({ content: "❌ Verification channel must be a text channel.", ephemeral: true });
        return;
      }

      if (!(roleValue instanceof Role)) {
        await interaction.reply({ content: "❌ Invalid role provided.", ephemeral: true });
        return;
      }

      const channel = channelValue;
      const role = roleValue;

      const botMember = interaction.guild.members.me;
      if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.reply({ content: "❌ Bot needs Manage Roles permission.", ephemeral: true });
        return;
      }

      if (botMember.roles.highest.position <= role.position) {
        await interaction.reply({ content: "❌ I cannot grant that role due to hierarchy.", ephemeral: true });
        return;
      }

      const verifyEmbed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle("✅ Verification Required")
        .setDescription("A staff member can verify you and grant access.")
        .addFields({ name: "Verification Role", value: `<@&${role.id}>`, inline: true })
        .setFooter({ text: "RUDRA.0x Verification" });

      const verifyMessage = await channel.send({ embeds: [verifyEmbed] });

      const config = runtimeConfigStore.getGatewayConfig(interaction.guild.id);
      config.verifyChannelId = channel.id;
      config.verifyRoleId = role.id;
      config.verifyMessageId = verifyMessage.id;
      runtimeConfigStore.setGatewayConfig(interaction.guild.id, config);

      await interaction.reply({
        content: `✅ Verification configured in <#${channel.id}> with role <@&${role.id}>.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error in /verify-setup:", error);
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ Failed to setup verification.", ephemeral: true });
      }
    }
  },
};

export default command;

