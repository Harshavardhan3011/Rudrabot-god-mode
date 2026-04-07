import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ai-summarize")
    .setDescription("Summarize long content using AI")
    .addStringOption(option =>
      option.setName("text")
        .setDescription("Text to summarize")
        .setRequired(true)
        .setMaxLength(2000)
    )
    .addStringOption(option =>
      option.setName("style")
        .setDescription("Summary style")
        .setRequired(false)
        .addChoices(
          { name: "Bullet Points", value: "bullets" },
          { name: "Paragraph", value: "paragraph" },
          { name: "Key Takeaways", value: "takeaways" }
        )
    ),

  name: "ai-summarize",
  description: "Summarize long content",
  category: "ai",
  module: "ai",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (10 seconds between summarizations)
      const cooldownExpires = cooldowns.get(userId);
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ AI is processing. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      cooldowns.set(userId, now + 10000);

      const textToSummarize = interaction.options.getString("text", true);
      const style = interaction.options.getString("style") || "paragraph";

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

      let summary: string;
      try {
        // Create prompt based on style
        let stylePrompt = "";
        if (style === "bullets") {
          stylePrompt = "Provide the summary as bullet points. Format: • Point 1\n• Point 2\n• etc";
        } else if (style === "takeaways") {
          stylePrompt = "Provide the key takeaways. Format: Key Takeaway 1\nKey Takeaway 2\nKey Takeaway 3";
        } else {
          stylePrompt = "Provide the summary as a concise paragraph.";
        }

        const prompt = `Summarize the following text in 2-3 sentences or points. ${stylePrompt}\n\nText:\n${textToSummarize}`;

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
        summary = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate summary.";

        // Trim if too long
        if (summary.length > 1900) {
          summary = summary.slice(0, 1900) + "...";
        }
      } catch (apiError) {
        console.error("❌ Gemini API Error:", apiError);
        await interaction.editReply({
          content: "❌ Failed to summarize. Please try with shorter text.",
        });
        return;
      }

      // Build response embed
      const embed = new EmbedBuilder()
        .setColor(0x4F46E5)
        .setTitle("📝 AI Summary")
        .addFields(
          {
            name: "Original Text",
            value: textToSummarize.length > 1024 
              ? textToSummarize.slice(0, 1021) + "..."
              : textToSummarize,
            inline: false,
          },
          {
            name: `Summary (${style === "bullets" ? "Bullet Points" : style === "takeaways" ? "Key Takeaways" : "Paragraph"})`,
            value: summary,
            inline: false,
          },
          {
            name: "📊 Stats",
            value: `Original: ${textToSummarize.length} chars | Summary: ${summary.length} chars | Reduction: ${Math.round((1 - summary.length / textToSummarize.length) * 100)}%`,
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x AI | Text Summarization" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "ai-summarize",
        executorId: userId,
        guildId: interaction.guild?.id || "dm",
        details: { 
          originalLength: textToSummarize.length,
          summaryLength: summary.length,
          style,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /ai-summarize:", error);
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred summarizing the text.",
          ephemeral: true,
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ An error occurred summarizing the text.",
        });
      }
    }
  },
};

export default command;

