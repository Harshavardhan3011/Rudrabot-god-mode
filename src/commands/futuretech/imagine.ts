import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { Command } from "../../types";
import { AuditLogger } from "../../database/auditLogger";
import https from "https";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("imagine")
    .setDescription("Generate imaginative AI art from description")
    .addStringOption(option =>
      option.setName("prompt")
        .setDescription("Detailed description of the image to generate")
        .setRequired(true)
        .setMaxLength(500)
    )
    .addStringOption(option =>
      option.setName("style")
        .setDescription("Art style (cyberpunk, fantasy, surreal, realistic, neon)")
        .addChoices(
          { name: "Cyberpunk", value: "cyberpunk" },
          { name: "Fantasy", value: "fantasy" },
          { name: "Surreal", value: "surreal" },
          { name: "Realistic", value: "realistic" },
          { name: "Neon", value: "neon" }
        )
        .setRequired(false)
    ),

  name: "imagine",
  description: "Generate imaginative art",
  category: "future-tech",
  module: "futuretech",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (60 seconds per user - image generation is slow)
      const cooldownExpires = cooldowns.get(userId);
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ Command on cooldown. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      cooldowns.set(userId, now + 60000);

      const prompt = interaction.options.getString("prompt", true);
      const style = interaction.options.getString("style") || "cyberpunk";

      // Enhance prompt with style
      const enhancedPrompt = `${prompt}, ${style} style, highly detailed, professional quality, 4k`;

      await interaction.deferReply();

      try {
        // Generate image via Pollinations API
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=768&height=768&seed=${Date.now()}`;

        // Verify URL exists with HEAD request
        const urlValid = await new Promise<boolean>((resolve) => {
          const req = https.request(imageUrl, { method: "HEAD" }, (res: any) => {
            resolve(res.statusCode === 200);
          }).on("error", () => resolve(false));
          req.end();
        });

        if (!urlValid) {
          await interaction.editReply({
            content: "❌ Failed to generate image. Try a different prompt.",
          });
          return;
        }

        // Build response embed
        const embed = new EmbedBuilder()
          .setColor(0x9C27B0)
          .setTitle("🎨 Imagine - AI Art Generation")
          .setDescription(`Generated using: **${style}** style`)
          .addFields(
            {
              name: "📝 Prompt",
              value: prompt.length > 200 ? prompt.slice(0, 197) + "..." : prompt,
              inline: false,
            },
            {
              name: "🎨 Style",
              value: style.charAt(0).toUpperCase() + style.slice(1),
              inline: true,
            },
            {
              name: "📏 Resolution",
              value: "768x768",
              inline: true,
            }
          )
          .setImage(imageUrl)
          .setFooter({ text: "RUDRA.0x Futuretech" })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // Log action
        auditLogger.log({
          action: "imagine",
          executorId: userId,
          guildId: interaction.guild?.id || "dm",
          guildName: interaction.guild?.name || "DM",
          details: {
            promptLength: prompt.length,
            style,
          },
          success: true,
        });

      } catch (apiError) {
        console.error("Error with imagine API:", apiError);
        await interaction.editReply({
          content: "❌ Failed to generate image. Please try again.",
        });
      }

    } catch (error) {
      console.error("❌ Error in /imagine:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred generating the image.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

