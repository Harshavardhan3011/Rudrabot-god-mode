import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types";
import auditLogger from "../../database/auditLogger";
import { getOrCreateGuildData, saveGuildData } from "../../database/guildSecurityMatrix";

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 4000;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("mod-warn")
    .setDescription("Warn a member and persist warning record")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to warn").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for warning").setRequired(true)
    ),
  name: "mod-warn",
  description: "Warn a member",
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

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({ content: "❌ You need Moderate Members permission.", ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true).trim();
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({ content: "❌ Target user is not in this server.", ephemeral: true });
      return;
    }

    if (targetMember.id === interaction.user.id) {
      await interaction.reply({ content: "❌ You cannot warn yourself.", ephemeral: true });
      return;
    }

    try {
      const guildData = await getOrCreateGuildData(interaction.guild.id, interaction.guild.name, interaction.guild.ownerId);
      const warningId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const warningEntry = {
        id: warningId,
        userId: targetMember.id,
        moderatorId: interaction.user.id,
        reason,
        createdAt: Date.now(),
      };

      if (!Array.isArray(guildData.moderationWarnings)) {
        guildData.moderationWarnings = [];
      }
      guildData.moderationWarnings.push(warningEntry);

      const saved = await saveGuildData(interaction.guild.id, guildData);
      if (!saved) {
        await interaction.reply({ content: "❌ Failed to store warning in database.", ephemeral: true });
        return;
      }

      await targetMember.send(`⚠️ You were warned in **${interaction.guild.name}**. Reason: ${reason}`).catch(() => null);

      const totalWarnings = guildData.moderationWarnings.filter((w: any) => w.userId === targetMember.id).length;

      auditLogger.log({
        action: "mod-warn",
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetMember.id,
        targetName: targetMember.user.tag,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        details: { reason, warningId, totalWarnings },
        success: true,
      });

      console.log(`✅ /mod-warn executed by ${interaction.user.tag} on ${targetMember.user.tag}`);
      await interaction.reply({
        content: `✅ Warned ${targetMember.user.tag}. Warning ID: \`${warningId}\` (total warnings: ${totalWarnings})`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("mod-warn failed:", error);
      auditLogger.log({
        action: "mod-warn",
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetMember?.id,
        targetName: targetMember?.user?.tag,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        details: { reason },
        success: false,
        error: String(error),
      });
      await interaction.reply({ content: "❌ Failed due to real error while warning user.", ephemeral: true });
    }
  },
};

export default command;

