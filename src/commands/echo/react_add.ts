import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import DatabaseHandler from "../../database/dbHandler";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("react-add")
    .setDescription("Add automatic reaction rule (when message contains X, add emoji)")
    .addStringOption(option =>
      option.setName("trigger")
        .setDescription("Text to trigger reaction (case-insensitive)")
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option.setName("emoji")
        .setDescription("Emoji to add (use native emoji like 😂 or name like :laughing:)")
        .setRequired(true)
        .setMaxLength(20)
    ),

  name: "react-add",
  description: "Add auto reaction rule",
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
      const emojiInput = interaction.options.getString("emoji", true);

      // Validate emoji (basic check)
      const isValidEmoji = /^[\p{Emoji}\p{Emoji_Component}]+$/u.test(emojiInput) || /:[a-zA-Z0-9_]+:/.test(emojiInput);
      if (!isValidEmoji) {
        await interaction.reply({
          content: "❌ Invalid emoji format. Use native emoji like 😂 or named emoji like :laughing:",
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
      if (!guildData) {
        await interaction.reply({
          content: "❌ Guild not initialized.",
          ephemeral: true,
        });
        return;
      }

      // Initialize reaction rules if needed
      if (!guildData.reactionRules) {
        guildData.reactionRules = [];
      }

      // Check if trigger already exists
      const exists = guildData.reactionRules.some(r => r.trigger === trigger);
      if (exists) {
        await interaction.reply({
          content: `❌ Reaction rule for "${trigger}" already exists.`,
          ephemeral: true,
        });
        return;
      }

      // Add new reaction rule
      guildData.reactionRules.push({
        id: `react-${Date.now()}`,
        trigger,
        emoji: emojiInput,
        createdAt: now,
        createdBy: userId,
      });

      // Limit to 30 reactions per guild
      if (guildData.reactionRules.length > 30) {
        guildData.reactionRules.shift(); // Remove oldest
      }

      guildData.updatedAt = now;

      // Save to database
      const saved = await db.setGuild(interaction.guild.id, guildData);
      if (!saved) {
        await interaction.reply({
          content: "❌ Failed to save reaction rule.",
          ephemeral: true,
        });
        return;
      }

      // Build response embed
      const embed = new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle("✅ Auto Reaction Added")
        .addFields(
          {
            name: "🎯 Trigger",
            value: `\`${trigger}\``,
            inline: true,
          },
          {
            name: "😊 Emoji",
            value: emojiInput,
            inline: true,
          },
          {
            name: "📊 Status",
            value: [
              `Active Rules: ${guildData.reactionRules.length}/30`,
              `Auto-reacts whenever message contains "${trigger}"`,
            ].join("\n"),
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x Echo System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "react-add",
        executorId: userId,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        details: {
          trigger,
          emoji: emojiInput,
          totalRules: guildData.reactionRules.length,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /react-add:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred adding reaction rule.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

