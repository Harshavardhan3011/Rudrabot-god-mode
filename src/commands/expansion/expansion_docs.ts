import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Command } from "../../types";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("expansion-docs")
    .setDescription("Access expansion module documentation and guides"),

  name: "expansion-docs",
  description: "Open expansion docs",
  category: "expansion",
  module: "expansion",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (5 seconds per user)
      const cooldownExpires = cooldowns.get(userId);
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ Command on cooldown. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      cooldowns.set(userId, now + 5000);

      // Build comprehensive documentation embed
      const docsEmbed = new EmbedBuilder()
        .setColor(0x3B82F6)
        .setTitle("📚 Expansion Module Documentation")
        .setDescription("Complete guide to growing and expanding your server")
        .addFields(
          {
            name: "🚀 Getting Started",
            value: [
              "1. Use `/expansion-init enable` to start tracking",
              "2. Monitor progress with `/expansion-status`",
              "3. Reach milestones to unlock features",
            ].join("\n"),
            inline: false,
          },
          {
            name: "📊 Growth Phases",
            value: [
              "🟡 **Dormant** (0-50): Startup phase",
              "🟠 **Launch** (50-100): Growing community",
              "🟢 **Growth** (100-500): Rapid expansion",
              "🔵 **Expansion** (500+): Major server",
            ].join("\n"),
            inline: false,
          },
          {
            name: "🎁 Unlockable Features",
            value: [
              "50+ members: Custom welcome messages",
              "100+ members: Advanced moderation",
              "250+ members: Premium voice control",
              "500+ members: Full admin suite",
            ].join("\n"),
            inline: false,
          },
          {
            name: "📈 Tracking Metrics",
            value: [
              "• Daily member growth rate",
              "• Peak activity hours",
              "• Member retention stats",
              "• Server health score",
            ].join("\n"),
            inline: false,
          },
          {
            name: "💡 Pro Tips",
            value: [
              "• Set clear server rules early",
              "• Create engagement channels",
              "• Reward active members with roles",
              "• Use analytics to optimize growth",
            ].join("\n"),
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x Expansion documentation" })
        .setTimestamp();

      // Create action row with buttons
      const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("expansion_guide")
            .setLabel("📖 Full Guide")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("expansion_faq")
            .setLabel("❓ FAQ")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("expansion_support")
            .setLabel("🆘 Support")
            .setStyle(ButtonStyle.Danger)
        );

      await interaction.reply({ 
        embeds: [docsEmbed],
        components: [buttons],
        ephemeral: true,
      });

      // Log action
      auditLogger.log({
        action: "expansion-docs",
        executorId: userId,
        guildId: interaction.guild?.id || "dm",
        guildName: interaction.guild?.name || "DM",
        details: {},
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /expansion-docs:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred fetching expansion documentation.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

