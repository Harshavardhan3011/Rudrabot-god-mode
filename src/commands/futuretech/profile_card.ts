import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, User } from "discord.js";
import { Command } from "../../types";
import DatabaseHandler from "../../database/dbHandler";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("profile-card")
    .setDescription("Generate advanced AI profile card for user")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User to generate card for (default: yourself)")
        .setRequired(false)
    ),

  name: "profile-card",
  description: "Create advanced profile card",
  category: "future-tech",
  module: "futuretech",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (20 seconds per user)
      const cooldownExpires = cooldowns.get(userId);
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ Command on cooldown. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      cooldowns.set(userId, now + 20000);

      const targetUser = interaction.options.getUser("user") || interaction.user;

      await interaction.deferReply();

      // Get database
      const db = (global as any).db as DatabaseHandler | undefined;
      if (!db) {
        await interaction.editReply({
          content: "❌ Database unavailable.",
        });
        return;
      }

      // Fetch user data
      const userData = await db.getUser(targetUser.id);
      
      // Calculate stats
      const accountAgeMs = Date.now() - targetUser.createdTimestamp;
      const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));
      const joinedDate = targetUser.createdAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      // Get user status
      const member = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
      const status = member?.presence?.status || "offline";
      const statusEmoji = status === "online" ? "🟢" : status === "idle" ? "🟡" : status === "dnd" ? "🔴" : "⚫";

      // Build profile card embed
      const embed = new EmbedBuilder()
        .setColor(0x9C27B0)
        .setTitle(`${targetUser.username}'s Profile Card`)
        .setDescription(`${statusEmoji} ${status.toUpperCase()}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .addFields(
          {
            name: "👤 Username",
            value: targetUser.tag,
            inline: true,
          },
          {
            name: "🆔 User ID",
            value: targetUser.id,
            inline: true,
          },
          {
            name: "📅 Account Age",
            value: `${accountAgeDays} days\n(${joinedDate})`,
            inline: true,
          },
          {
            name: "⭐ Stats",
            value: [
              `Level: ${userData?.level || 1}`,
              `Experience: ${userData?.xp || 0} XP`,
              `Balance: 💰 ${userData?.balance || 0} coins`,
            ].join("\n"),
            inline: true,
          },
          {
            name: "🎖️ Achievements",
            value: userData?.achievements?.length
              ? `${userData.achievements.length} unlocked\n${userData.achievements.slice(0, 3).join(", ")}${userData.achievements.length > 3 ? "..." : ""}`
              : "No achievements yet",
            inline: true,
          },
          {
            name: "🏆 Rank",
            value: getRankBadge(userData?.level || 1),
            inline: true,
          }
        )
        .setFooter({ text: "RUDRA.0x Futuretech - AI Profile Card" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "profile-card",
        executorId: userId,
        guildId: interaction.guild?.id || "dm",
        guildName: interaction.guild?.name || "DM",
        details: {
          targetUserId: targetUser.id,
          targetUserTag: targetUser.tag,
          userLevel: userData?.level || 1,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /profile-card:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred generating the profile card.",
          ephemeral: true,
        });
      }
    }
  },
};

function getRankBadge(level: number): string {
  if (level < 10) return "🥉 Bronze";
  if (level < 25) return "🥈 Silver";
  if (level < 50) return "🥇 Gold";
  if (level < 100) return "💎 Diamond";
  return "👑 Legend";
}

export default command;

