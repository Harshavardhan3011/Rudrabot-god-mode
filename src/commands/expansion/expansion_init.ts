import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import DatabaseHandler from "../../database/dbHandler";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("expansion-init")
    .setDescription("Initialize server expansion module for growth tracking")
    .addBooleanOption(option =>
      option.setName("enable")
        .setDescription("Enable or disable expansion tracking")
        .setRequired(true)
    ),

  name: "expansion-init",
  description: "Initialize expansion module",
  category: "expansion",
  module: "expansion",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (30 seconds per guild)
      const guildKey = `expansion-${interaction.guild?.id}`;
      const cooldownExpires = cooldowns.get(guildKey);
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ Command on cooldown. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      cooldowns.set(guildKey, now + 30000);

      if (!interaction.guild) {
        await interaction.reply({
          content: "❌ This command only works in guilds.",
          ephemeral: true,
        });
        return;
      }

      // Check permissions
      if (!interaction.memberPermissions?.has("ManageGuild")) {
        await interaction.reply({
          content: "❌ You need `Manage Guild` permission.",
          ephemeral: true,
        });
        return;
      }

      const enable = interaction.options.getBoolean("enable", true);

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
      if (!guildData) {
        await interaction.reply({
          content: "❌ Guild not initialized.",
          ephemeral: true,
        });
        return;
      }

      // Initialize expansion if needed
      if (!guildData.expansion) {
        guildData.expansion = {
          enabled: false,
          membersJoinedTracking: 0,
          totalMembersAtInit: 0,
          growthRate: 0,
          currentPhase: "dormant",
          initiatedAt: 0,
        };
      }

      const wasEnabled = guildData.expansion.enabled;

      // Update expansion settings
      guildData.expansion.enabled = enable;
      if (enable && guildData.expansion.initiatedAt === 0) {
        guildData.expansion.initiatedAt = now;
        guildData.expansion.totalMembersAtInit = interaction.guild.memberCount;
        guildData.expansion.currentPhase = "launch";
      }
      guildData.updatedAt = now;

      // Save to database
      const saved = await db.setGuild(interaction.guild.id, guildData);
      if (!saved) {
        await interaction.reply({
          content: "❌ Failed to save expansion settings.",
          ephemeral: true,
        });
        return;
      }

      // Build response embed
      const embed = new EmbedBuilder()
        .setColor(enable ? 0x10B981 : 0xEF4444)
        .setTitle(enable ? "🚀 Expansion Module Initialized" : "✅ Expansion Module Disabled")
        .addFields(
          {
            name: "📊 Status",
            value: enable ? "🟢 ACTIVE - Growth tracking enabled" : "🔴 INACTIVE - Growth tracking disabled",
            inline: true,
          },
          {
            name: "👥 Starting Members",
            value: enable ? `${interaction.guild.memberCount}` : "N/A",
            inline: true,
          },
          {
            name: "📈 Features Enabled",
            value: enable
              ? [
                  "✅ Member growth tracking",
                  "✅ Expansion analytics",
                  "✅ Growth rate calculation",
                  "✅ Phase-based milestones",
                ].join("\n")
              : "All features disabled",
            inline: false,
          },
          {
            name: "🎯 Phases",
            value: enable
              ? [
                  "🟡 **Dormant** (0-50 members)",
                  "🟠 **Launch** (50-100 members)",
                  "🟢 **Growth** (100-500 members)",
                  "🔵 **Expansion** (500+ members)",
                ].join("\n")
              : "Not initialized",
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x Expansion System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "expansion-init",
        executorId: userId,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        details: {
          enabled: enable,
          wasEnabled,
          startingMembers: interaction.guild.memberCount,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /expansion-init:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred initializing expansion module.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

