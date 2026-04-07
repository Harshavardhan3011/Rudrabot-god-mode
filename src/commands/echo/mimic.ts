import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, User } from "discord.js";
import { Command } from "../../types";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("mimic")
    .setDescription("Mimic recent messages from a user")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User to mimic (fetches 5 recent messages)")
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName("anonymous")
        .setDescription("Send as anonymous bot response (true) or as reply (false)")
        .setRequired(false)
    ),

  name: "mimic",
  description: "Mimic selected user text",
  category: "echo",
  module: "echo",

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

      if (!interaction.guild) {
        await interaction.reply({
          content: "❌ This command only works in guilds.",
          ephemeral: true,
        });
        return;
      }

      const targetUser = interaction.options.getUser("user", true);
      const isAnonymous = interaction.options.getBoolean("anonymous") || false;

      // Prevent self-mimic
      if (targetUser.id === interaction.user.id) {
        await interaction.reply({
          content: "❌ You cannot mimic yourself!",
          ephemeral: true,
        });
        return;
      }

      // Prevent bot-mimic
      if (targetUser.bot) {
        await interaction.reply({
          content: "❌ You cannot mimic bots.",
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      // Fetch recent messages from target user
      const channel = interaction.channel;
      if (!channel || !channel.isDMBased() === false) {
        await interaction.editReply({
          content: "❌ Could not access channel messages.",
        });
        return;
      }

      try {
        const messages = await channel.messages.fetch({ limit: 50 });
        const userMessages = messages
          .filter(m => m.author.id === targetUser.id && m.content.length > 0 && !m.content.startsWith("/"))
          .map(m => m.content)
          .slice(0, 5);

        if (userMessages.length === 0) {
          await interaction.editReply({
            content: `❌ No recent messages found from ${targetUser.tag}.`,
          });
          return;
        }

        // Select random message
        const mimickedMessage = userMessages[Math.floor(Math.random() * userMessages.length)];

        // Build response
        if (isAnonymous) {
          await interaction.editReply({
            content: mimickedMessage,
          });
        } else {
          await interaction.editReply({
            content: `**Mimicking ${targetUser.tag}:**\n> ${mimickedMessage}`,
          });
        }

        // Log action
        auditLogger.log({
          action: "mimic",
          executorId: userId,
          guildId: interaction.guild.id,
          guildName: interaction.guild.name,
          details: {
            targetUserId: targetUser.id,
            targetUserTag: targetUser.tag,
            messageLength: mimickedMessage.length,
            anonymous: isAnonymous,
          },
          success: true,
        });

      } catch (fetchError) {
        console.error("Error fetching messages:", fetchError);
        await interaction.editReply({
          content: "❌ Could not fetch recent messages.",
        });
      }

    } catch (error) {
      console.error("❌ Error in /mimic:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred mimicking the user.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

