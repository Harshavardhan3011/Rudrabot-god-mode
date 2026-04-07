import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ai-chat")
    .setDescription("Chat with Gemini AI")
    .addStringOption(option =>
      option.setName("prompt")
        .setDescription("Your message for the AI")
        .setRequired(true)
        .setMaxLength(1000)
    ),

  name: "ai-chat",
  description: "Chat with Gemini AI",
  category: "ai",
  module: "ai",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (8 seconds between requests)
      const cooldownExpires = cooldowns.get(userId);
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ AI is thinking. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      cooldowns.set(userId, now + 8000);

      const prompt = interaction.options.getString("prompt", true);

      // Defer reply (API call might take time)
      await interaction.deferReply();

      // Check for API key
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        await interaction.editReply({
          content: "❌ Gemini API key not configured.",
        });
        return;
      }

      let response: string;
      try {
        // Call Gemini API
        const result = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        });

        if (!result.ok) {
          throw new Error(`API Error: ${result.statusText}`);
        }

        const data = (await result.json()) as any;
        response = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";

        // Trim long responses
        if (response.length > 1900) {
          response = response.slice(0, 1900) + "...";
        }
      } catch (apiError) {
        console.error("❌ Gemini API Error:", apiError);
        await interaction.editReply({
          content: "❌ Failed to get AI response. Please try again.",
        });
        return;
      }

      // Build response embed
      const embed = new EmbedBuilder()
        .setColor(0x4F46E5)
        .setTitle("🤖 Gemini Response")
        .addFields(
          {
            name: "Your Question",
            value: prompt.length > 1024 ? prompt.slice(0, 1021) + "..." : prompt,
            inline: false,
          },
          {
            name: "AI Answer",
            value: response,
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x AI | Powered by Google Gemini" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "ai-chat",
        executorId: userId,
        guildId: interaction.guild?.id || "dm",
        details: { 
          promptLength: prompt.length,
          responseLength: response.length,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /ai-chat:", error);
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred with AI chat.",
          ephemeral: true,
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ An error occurred with AI chat.",
        });
      }
    }
  },
};

export default command;

