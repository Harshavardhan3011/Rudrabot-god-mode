import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { Command } from "../../types";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ai-image")
    .setDescription("Generate an AI image from text description")
    .addStringOption(option =>
      option.setName("prompt")
        .setDescription("Description of the image to generate")
        .setRequired(true)
        .setMaxLength(500)
    ),

  name: "ai-image",
  description: "Generate an AI image",
  category: "ai",
  module: "ai",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (30 seconds - image generation takes time)
      const cooldownExpires = cooldowns.get(userId);
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ Image generation in progress. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      cooldowns.set(userId, now + 30000);

      const prompt = interaction.options.getString("prompt", true);

      // Defer reply (API call will take time)
      await interaction.deferReply();

      let imageUrl: string;
      try {
        // Use a free image generation API (Pollinations.ai - no auth required)
        imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${Date.now()}`;

        // Verify the image can be fetched
        const imageCheck = await fetch(imageUrl, { method: "HEAD" });
        if (!imageCheck.ok) {
          throw new Error("Image generation failed");
        }
      } catch (apiError) {
        console.error("❌ Image Generation Error:", apiError);
        await interaction.editReply({
          content: "❌ Failed to generate image. Try a simpler description.",
        });
        return;
      }

      // Build response embed with image
      const embed = new EmbedBuilder()
        .setColor(0x4F46E5)
        .setTitle("🎨 AI Generated Image")
        .setDescription(prompt)
        .setImage(imageUrl)
        .setFooter({ text: "RUDRA.0x AI | Image Generation" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "ai-image",
        executorId: userId,
        guildId: interaction.guild?.id || "dm",
        details: { 
          promptLength: prompt.length,
          generatedImage: true,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /ai-image:", error);
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred generating the image.",
          ephemeral: true,
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ An error occurred generating the image.",
        });
      }
    }
  },
};

export default command;

