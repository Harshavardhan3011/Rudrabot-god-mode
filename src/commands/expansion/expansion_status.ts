import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import DatabaseHandler from "../../database/dbHandler";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("expansion-status")
    .setDescription("View server expansion status and analytics"),

  name: "expansion-status",
  description: "View expansion status",
  category: "expansion",
  module: "expansion",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (15 seconds per guild)
      const guildKey = `expansion-status-${interaction.guild?.id}`;
      const cooldownExpires = cooldowns.get(guildKey);
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ Command on cooldown. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      cooldowns.set(guildKey, now + 15000);

      if (!interaction.guild) {
        await interaction.reply({
          content: "❌ This command only works in guilds.",
          ephemeral: true,
        });
        return;
      }

      // Get database
      const db = (global as any).db as DatabaseHandler | undefined;
      if (!db) {
        await interaction.reply({
          content: "❌ Database unavailable.",
          ephemeral: true,
        });
        return;
      }

      // Fetch guild data
      const guildData = await db.getGuild(interaction.guild.id);
      if (!guildData || !guildData.expansion?.enabled) {
        await interaction.reply({
          content: "❌ Expansion module not enabled. Use `/expansion-init enable` to start.",
          ephemeral: true,
        });
        return;
      }

      // Calculate expansion metrics
      const expansion = guildData.expansion;
      const currentMembers = interaction.guild.memberCount;
      const startMembers = expansion.totalMembersAtInit || currentMembers;
      const growth = currentMembers - startMembers;
      const growthPercent = startMembers > 0 ? Math.round((growth / startMembers) * 100) : 0;

      // Determine current phase
      let phase = "🟡 Dormant";
      if (currentMembers >= 500) phase = "🔵 Expansion";
      else if (currentMembers >= 100) phase = "🟢 Growth";
      else if (currentMembers >= 50) phase = "🟠 Launch";

      // Calculate time since init
      const timeSinceInit = expansion.initiatedAt ? now - expansion.initiatedAt : 0;
      const daysSinceInit = Math.floor(timeSinceInit / (1000 * 60 * 60 * 24));
      const dailyGrowth = daysSinceInit > 0 ? (growth / daysSinceInit).toFixed(1) : "0.0";

      // Build status embed
      const embed = new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle("📊 Server Expansion Status")
        .addFields(
          {
            name: "🎯 Current Phase",
            value: phase,
            inline: true,
          },
          {
            name: "👥 Members",
            value: `${currentMembers}`,
            inline: true,
          },
          {
            name: "📈 Growth",
            value: `+${growth} (${growthPercent}%)`,
            inline: true,
          },
          {
            name: "📅 Timeline",
            value: [
              `Started: ${daysSinceInit} days ago`,
              `Daily avg: ${dailyGrowth} members/day`,
              `At this rate: ${daysSinceInit > 0 ? Math.round(500 / parseFloat(dailyGrowth)) : "?"} days to 500`,
            ].join("\n"),
            inline: false,
          },
          {
            name: "🔓 Unlocked Features",
            value: [
              currentMembers >= 50 ? "✅" : "❌" + " Welcome customization",
              currentMembers >= 100 ? "✅" : "❌" + " Advanced moderation",
              currentMembers >= 250 ? "✅" : "❌" + " Premium voice control",
              currentMembers >= 500 ? "✅" : "❌" + " Full admin suite",
            ].join("\n"),
            inline: false,
          },
          {
            name: "🎁 Next Milestone",
            value: getNextMilestone(currentMembers),
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x Expansion Analytics" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "expansion-status",
        executorId: userId,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        details: {
          currentMembers,
          phase: expansion.currentPhase,
          growthPercent,
          daysSinceInit,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /expansion-status:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred fetching expansion status.",
          ephemeral: true,
        });
      }
    }
  },
};

function getNextMilestone(members: number): string {
  if (members < 50) return "50 members: Custom welcome messages";
  if (members < 100) return "100 members: Advanced moderation tools";
  if (members < 250) return "250 members: Premium voice control";
  if (members < 500) return "500 members: Full admin suite";
  return "🎉 All features unlocked! Congratulations!";
}

export default command;

