import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import { getOrCreateUserData, saveUserData } from "../../utils/helpers";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();

const cooldowns = new Map<string, number>();

// Validate YouTube channel ID format (11 characters, alphanumeric with - and _)
function isValidYouTubeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{24}$/.test(id); // YouTube channel IDs are typically 24 chars for UCxxxxxx format
}

// Extract YouTube channel ID from URL or accept raw ID
function extractYouTubeId(input: string): string | null {
  // If already looks like a channel ID
  if (input.startsWith("UC") && input.length === 24) {
    return input;
  }
  
  // Extract from youtube.com/channel/... URL
  const channelMatch = input.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]{24})/);
  if (channelMatch) {
    return channelMatch[1];
  }
  
  // Extract from youtu.be or youtube.com/c/username URLs
  const userMatch = input.match(/youtube\.com\/c\/([a-zA-Z0-9_-]+)/);
  if (userMatch) {
    return userMatch[1]; // Note: In production, would need to resolve username to channel ID
  }
  
  return null;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("yt-add")
    .setDescription("Link a YouTube channel to your profile")
    .addStringOption(option =>
      option
        .setName("channel")
        .setDescription("YouTube channel URL or Channel ID")
        .setRequired(true)
    ),

  name: "yt-add",
  description: "Link a YouTube channel",
  category: "creator",
  module: "creator",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      // Cooldown check (15 seconds per user)
      const userId = interaction.user.id;
      const now = Date.now();
      const cooldownExpires = cooldowns.get(userId);
      
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ Command on cooldown. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      // Set cooldown
      cooldowns.set(userId, now + 15000);

      const channelInput = interaction.options.getString("channel", true);

      // Validate and extract YouTube ID
      const youtubeId = extractYouTubeId(channelInput);
      if (!youtubeId) {
        await interaction.reply({
          content: "❌ Invalid YouTube URL or Channel ID. Please provide:\n" +
            "• Channel URL: `https://youtube.com/channel/UC...`\n" +
            "• Or Channel ID: `UC...` (starts with UC, 24 characters)",
          ephemeral: true,
        });
        return;
      }

      // Fetch user data
      const userData = await getOrCreateUserData(userId, interaction.user.username);
      if (!userData) {
        await interaction.reply({
          content: "❌ Could not load user data.",
          ephemeral: true,
        });
        return;
      }

      // Initialize creator profile if needed
      if (!userData.creatorProfile) {
        userData.creatorProfile = {
          youtubeId: null,
          youtubeSubscribers: 0,
          youtubeViews: 0,
          youtubeVideos: 0,
          twitchUsername: null,
          twitchFollowers: 0,
          twitterHandle: null,
          twitterFollowers: 0,
          totalViewsAllPlatforms: 0,
          lastSyncedAt: 0,
          createdAt: Date.now(),
        };
      }

      // Check if already linked
      if (userData.creatorProfile.youtubeId && userData.creatorProfile.youtubeId !== youtubeId) {
        await interaction.reply({
          content: `⚠️ You already have a YouTube channel linked (\`${userData.creatorProfile.youtubeId}\`). ` +
            `React with ✅ to update, or ❌ to cancel.`,
          ephemeral: true,
        });
        return;
      }

      if (userData.creatorProfile.youtubeId === youtubeId) {
        await interaction.reply({
          content: `ℹ️ This channel is already linked to your profile.`,
          ephemeral: true,
        });
        return;
      }

      // Link the channel
      userData.creatorProfile.youtubeId = youtubeId;
      const saved = await saveUserData(userId, userData);

      if (!saved) {
        await interaction.reply({
          content: "❌ Failed to save YouTube channel. Please try again.",
          ephemeral: true,
        });
        return;
      }

      // Build confirmation embed
      const linkEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("✅ YouTube Channel Linked")
        .setDescription(`Successfully linked your YouTube channel!`)
        .addFields(
          {
            name: "Channel ID",
            value: `\`${youtubeId}\``,
            inline: true,
          },
          {
            name: "Next Step",
            value: "Use `/social-sync` to fetch your latest stats",
            inline: true,
          },
          {
            name: "Manage",
            value: "Use `/creator-stats` to view your profile",
            inline: false,
          }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [linkEmbed] });

      // Log action
      auditLogger.log({
        action: "yt-add",
        executorId: userId,
        guildId: interaction.guild?.id || "dm",
        details: { youtubeId, success: true },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /yt-add:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred linking your YouTube channel.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

