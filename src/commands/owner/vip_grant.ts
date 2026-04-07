import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types";
import permissionValidator from "../../utils/permissionValidator";
import vipHandler, { VIPDurationChoice, VIPTier } from "../../database/vipHandler";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("vip-grant")
    .setDescription("Grant VIP tier access to a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option.setName("user").setDescription("Target user").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("tier")
        .setDescription("VIP tier")
        .setRequired(true)
        .addChoices(
          { name: "VIP", value: "VIP" },
          { name: "VIP_PRTR", value: "VIP_PRTR" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("VIP duration")
        .setRequired(true)
        .addChoices(
          { name: "1hr", value: "1hr" },
          { name: "12hr", value: "12hr" },
          { name: "24hr", value: "24hr" },
          { name: "3days", value: "3days" },
          { name: "7days", value: "7days" },
          { name: "14days", value: "14days" },
          { name: "30days", value: "30days" },
          { name: "6months", value: "6months" },
          { name: "1yr", value: "1yr" },
          { name: "Lifetime", value: "Lifetime" }
        )
    ),
  name: "vip-grant",
  description: "Grant VIP role access",
  category: "owner",
  module: "owner",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      if (!permissionValidator.isOwner(interaction.user.id)) {
        await interaction.reply({ content: "❌ Owner only command.", ephemeral: true });
        return;
      }

      const user = interaction.options.getUser("user", true);
      const tier = interaction.options.getString("tier", true) as VIPTier;
      const duration = interaction.options.getString("duration", true) as VIPDurationChoice;

      if (user.bot) {
        await interaction.reply({ content: "❌ Bots cannot receive VIP access.", ephemeral: true });
        return;
      }

      const record = vipHandler.grant(user.id, duration, interaction.user.id, tier);

      if (interaction.guild) {
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        const role = interaction.guild.roles.cache.find((r) => r.name.toUpperCase() === tier);
        if (member && role && interaction.guild.members.me?.roles.highest.position! > role.position) {
          await member.roles.add(role).catch(() => null);
        }
      }

      const expires = record.expiresAt === null ? "Lifetime" : new Date(record.expiresAt).toLocaleString();
      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("✅ VIP Granted")
        .addFields(
          { name: "User", value: `<@${user.id}>`, inline: true },
          { name: "Tier", value: tier, inline: true },
          { name: "Duration", value: duration, inline: true },
          { name: "Expires", value: expires, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error("Error in /vip-grant:", error);
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ Failed to grant VIP access.", ephemeral: true });
      }
    }
  },
};

export default command;

