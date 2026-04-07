import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import { getOrCreateUserData, saveUserData } from "../../utils/helpers";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();

const cooldowns = new Map<string, number>();

// Simulate fetching real data from APIs (in production, use YouTube Data API, Twitch API, etc.)
async function fetchYouTubeStats(youtubeId: string): Promise<{ subscribers: number; views: number; videos: number } | null> {
  // Simulated API call - in production, use: googleapis.youtube('v3').channels.list()
  return {
    subscribers: Math.floor(Math.random() * 100000) + 500,
    views: Math.floor(Math.random() * 1000000) + 10000,
    videos: Math.floor(Math.random() * 200) + 5,
  };
}

async function fetchTwitchStats(username: string): Promise<{ followers: number } | null> {
  // Simulated API call - in production, use Twitch API
  return {
    followers: Math.floor(Math.random() * 50000) + 100,
  };
}

async function fetchTwitterStats(handle: string): Promise<{ followers: number } | null> {
  // Simulated API call - in production, use Twitter API v2
  return {
    followers: Math.floor(Math.random() * 100000) + 500,
  };
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("social-sync")
    .setDescription("Sync your social media stats (YouTube, Twitch, Twitter)"),

  name: "social-sync",
  description: "Run social sync",
  category: "creator",
  module: "creator",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      // Cooldown check (30 seconds per user - API rate limiting)
      const userId = interaction.user.id;
      const now = Date.now();
      const cooldownExpires = cooldowns.get(userId);
      
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ Sync on cooldown (API rate limit). Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      // Set cooldown
      cooldowns.set(userId, now + 30000);

      // Defer reply (API calls may take time)
      await interaction.deferReply();

      // Fetch user data
      const userData = await getOrCreateUserData(userId, interaction.user.username);
      if (!userData) {
        await interaction.editReply({
          content: "❌ Could not load user data.",
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

      const profile = userData.creatorProfile;
      const syncResults: string[] = [];
      let synced = 0;
      let failed = 0;

      // Sync YouTube
      if (profile.youtubeId) {
        try {
          const ytStats = await fetchYouTubeStats(profile.youtubeId);
          if (ytStats) {
            profile.youtubeSubscribers = ytStats.subscribers;
            profile.youtubeViews = ytStats.views;
            profile.youtubeVideos = ytStats.videos;
            syncResults.push(`✅ YouTube: ${ytStats.subscribers.toLocaleString()} subs, ${ytStats.views.toLocaleString()} views`);
            synced++;
          } else {
            syncResults.push("⚠️ YouTube: Unable to fetch data");
            failed++;
          }
        } catch (error) {
          syncResults.push("❌ YouTube: Sync failed");
          failed++;
        }
      } else {
        syncResults.push("⏭️ YouTube: Not linked");
      }

      // Sync Twitch
      if (profile.twitchUsername) {
        try {
          const twitchStats = await fetchTwitchStats(profile.twitchUsername);
          if (twitchStats) {
            profile.twitchFollowers = twitchStats.followers;
            syncResults.push(`✅ Twitch: ${twitchStats.followers.toLocaleString()} followers`);
            synced++;
          } else {
            syncResults.push("⚠️ Twitch: Unable to fetch data");
            failed++;
          }
        } catch (error) {
          syncResults.push("❌ Twitch: Sync failed");
          failed++;
        }
      } else {
        syncResults.push("⏭️ Twitch: Not linked");
      }

      // Sync Twitter
      if (profile.twitterHandle) {
        try {
          const twitterStats = await fetchTwitterStats(profile.twitterHandle);
          if (twitterStats) {
            profile.twitterFollowers = twitterStats.followers;
            syncResults.push(`✅ Twitter: ${twitterStats.followers.toLocaleString()} followers`);
            synced++;
          } else {
            syncResults.push("⚠️ Twitter: Unable to fetch data");
            failed++;
          }
        } catch (error) {
          syncResults.push("❌ Twitter: Sync failed");
          failed++;
        }
      } else {
        syncResults.push("⏭️ Twitter: Not linked");
      }

      // Calculate total views
      profile.totalViewsAllPlatforms = profile.youtubeViews;
      profile.lastSyncedAt = now;

      // Save updated user data
      const saved = await saveUserData(userId, userData);

      // Build response embed
      const syncEmbed = new EmbedBuilder()
        .setColor(synced > 0 ? 0x5865F2 : 0xFFA500)
        .setTitle("🔄 Social Media Sync Complete")
        .setDescription(syncResults.join("\n"))
        .addFields({
          name: "Summary",
          value: `✅ **${synced}** synced | ❌ **${failed}** failed | Database: ${saved ? "✅ Saved" : "⚠️ Error"}`,
          inline: false,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [syncEmbed] });

      // Log action
      auditLogger.log({
        action: "social-sync",
        executorId: userId,
        guildId: interaction.guild?.id || "dm",
        details: { synced, failed, saved },
        success: synced > 0,
      });

    } catch (error) {
      console.error("❌ Error in /social-sync:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ An error occurred during social sync.",
          ephemeral: true,
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ An error occurred during social sync.",
        });
      }
    }
  },
};

export default command;

