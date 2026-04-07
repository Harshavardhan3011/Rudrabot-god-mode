import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types";
import auditLogger from "../../database/auditLogger";

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 5000;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("mod-mute")
    .setDescription("Temporarily mute a member using Discord timeout")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to mute").setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration in minutes (1-10080)")
        .setMinValue(1)
        .setMaxValue(10080)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for mute").setRequired(false)
    ),
  name: "mod-mute",
  description: "Mute a member",
  category: "moderation",
  module: "moderation",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const now = Date.now();
    const lastUsed = cooldowns.get(interaction.user.id) || 0;
    if (now - lastUsed < COOLDOWN_MS) {
      await interaction.reply({
        content: `⏳ Cooldown active. Try again in ${Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000)}s.`,
        ephemeral: true,
      });
      return;
    }
    cooldowns.set(interaction.user.id, now);

    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    const memberPermissions = interaction.memberPermissions;
    if (!memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({ content: "❌ You need Moderate Members permission.", ephemeral: true });
      return;
    }

    const me = interaction.guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({ content: "❌ I need Moderate Members permission.", ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const durationMinutes = interaction.options.getInteger("duration", true);
    const reason = interaction.options.getString("reason")?.trim() || "No reason provided";
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({ content: "❌ Target user is not in this server.", ephemeral: true });
      return;
    }
    if (targetMember.id === interaction.user.id) {
      await interaction.reply({ content: "❌ You cannot mute yourself.", ephemeral: true });
      return;
    }
    if (targetMember.id === interaction.guild.ownerId) {
      await interaction.reply({ content: "❌ You cannot mute the server owner.", ephemeral: true });
      return;
    }
    if (targetMember.moderatable === false) {
      await interaction.reply({ content: "❌ I cannot mute this member due to role hierarchy.", ephemeral: true });
      return;
    }

    const executorMember = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (
      executorMember &&
      targetMember.roles.highest.position >= executorMember.roles.highest.position &&
      interaction.guild.ownerId !== interaction.user.id
    ) {
      await interaction.reply({ content: "❌ You cannot mute a member with an equal or higher role.", ephemeral: true });
      return;
    }

    const durationMs = durationMinutes * 60 * 1000;
    try {
      await targetMember.timeout(durationMs, reason);

      auditLogger.log({
        action: "mod-mute",
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetMember.id,
        targetName: targetMember.user.tag,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        details: { durationMinutes, reason },
        success: true,
      });

      console.log(`✅ /mod-mute executed by ${interaction.user.tag} on ${targetMember.user.tag}`);
      await interaction.reply({
        content: `✅ Muted ${targetMember.user.tag} for **${durationMinutes} minute(s)**. Reason: ${reason}`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("mod-mute failed:", error);
      auditLogger.log({
        action: "mod-mute",
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetMember.id,
        targetName: targetMember.user.tag,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        details: { durationMinutes, reason },
        success: false,
        error: String(error),
      });
      await interaction.reply({ content: "❌ Failed due to real error while muting user.", ephemeral: true });
    }
  },
};

export default command;

