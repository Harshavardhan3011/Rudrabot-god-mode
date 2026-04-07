import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import DatabaseHandler from "../../database/dbHandler";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("echo-add")
    .setDescription("Add auto-reply trigger (when X appears, bot replies with Y)")
    .addStringOption(option =>
      option.setName("trigger")
        .setDescription("Text to trigger auto-reply (case-insensitive)")
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option.setName("response")
        .setDescription("Bot's auto-reply message")
        .setRequired(true)
        .setMaxLength(1024)
    )
    .addBooleanOption(option =>
      option.setName("exact")
        .setDescription("Match entire message (true) or just contains (false)")
        .setRequired(false)
    ),

  name: "echo-add",
  description: "Add auto reply trigger",
  category: "echo",
  module: "echo",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (10 seconds per user)
      const cooldownExpires = cooldowns.get(userId);
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ Command on cooldown. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      cooldowns.set(userId, now + 10000);

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

      const trigger = interaction.options.getString("trigger", true).toLowerCase();
      const response = interaction.options.getString("response", true);
      const exactMatch = interaction.options.getBoolean("exact") || false;

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

      // Initialize echo if needed
      if (!guildData.echoTriggers) {
        guildData.echoTriggers = [];
      }

      // Check if trigger already exists
      const exists = guildData.echoTriggers.some(t => t.trigger === trigger);
      if (exists) {
        await interaction.reply({
          content: `❌ Trigger "${trigger}" already exists. Remove it first with deletion.`,
          ephemeral: true,
        });
        return;
      }

      // Add new trigger
      guildData.echoTriggers.push({
        id: `echo-${Date.now()}`,
        trigger,
        response,
        exactMatch,
        createdAt: now,
        createdBy: userId,
      });

      // Limit to 50 triggers per guild
      if (guildData.echoTriggers.length > 50) {
        guildData.echoTriggers.shift(); // Remove oldest
      }

      guildData.updatedAt = now;

      // Save to database
      const saved = await db.setGuild(interaction.guild.id, guildData);
      if (!saved) {
        await interaction.reply({
          content: "❌ Failed to save echo trigger.",
          ephemeral: true,
        });
        return;
      }

      // Build response embed
      const embed = new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle("✅ Echo Trigger Added")
        .addFields(
          {
            name: "🎯 Trigger",
            value: `\`${trigger}\``,
            inline: true,
          },
          {
            name: "🤖 Response",
            value: response.length > 100 ? response.slice(0, 97) + "..." : response,
            inline: false,
          },
          {
            name: "⚙️ Settings",
            value: [
              `Match Type: ${exactMatch ? "Exact match" : "Contains trigger"}`,
              `Active Triggers: ${guildData.echoTriggers.length}/50`,
            ].join("\n"),
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x Echo System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "echo-add",
        executorId: userId,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        details: {
          trigger,
          exactMatch,
          responseLength: response.length,
          totalTriggers: guildData.echoTriggers.length,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /echo-add:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred adding echo trigger.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

