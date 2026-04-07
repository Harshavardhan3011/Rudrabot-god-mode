import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, ChannelType } from "discord.js";
import { Command } from "../../types";
import { getOrCreateUserData, saveUserData } from "../../utils/helpers";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();

const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("creator-stats")
    .setDescription("Show creator performance stats")
    .addUserOption(option => 
      option.setName("user")
        .setDescription("User to check stats for (default: yourself)")
        .setRequired(false)
    ),

  name: "creator-stats",
  description: "Show creator performance stats",
  category: "creator",
  module: "creator",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      // Cooldown check (10 seconds per user)
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
      cooldowns.set(userId, now + 10000);

      // Get target user
      const targetUser = interaction.options.getUser("user") || interaction.user;
      
      // Fetch or create user data
      const userData = await getOrCreateUserData(targetUser.id, targetUser.username);
      if (!userData) {
        await interaction.reply({
          content: "❌ Could not load user data. Please try again.",
          ephemeral: true,
        });
        return;
      }

      // Create creator profile if it doesn't exist
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

      // Build stats embed
      const profile = userData.creatorProfile;
      const isOwn = targetUser.id === interaction.user.id;
      
      const statsEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📊 Creator Stats - ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 512 }))
        .setTimestamp();

      // YouTube section
      if (profile.youtubeId) {
        statsEmbed.addFields({
          name: "🎥 YouTube",
          value: [
            `**Channel ID:** \`${profile.youtubeId}\``,
            `**Subscribers:** ${profile.youtubeSubscribers.toLocaleString()}`,
            `**Total Views:** ${profile.youtubeViews.toLocaleString()}`,
            `**Videos:** ${profile.youtubeVideos}`,
          ].join("\n"),
          inline: true,
        });
      } else {
        statsEmbed.addFields({
          name: "🎥 YouTube",
          value: isOwn ? `Use \`/yt-add\` to link your channel` : "Not linked",
          inline: true,
        });
      }

      // Twitch section
      if (profile.twitchUsername) {
        statsEmbed.addFields({
          name: "📺 Twitch",
          value: [
            `**Username:** ${profile.twitchUsername}`,
            `**Followers:** ${profile.twitchFollowers.toLocaleString()}`,
          ].join("\n"),
          inline: true,
        });
      } else {
        statsEmbed.addFields({
          name: "📺 Twitch",
          value: "Not linked",
          inline: true,
        });
      }

      // Twitter section
      if (profile.twitterHandle) {
        statsEmbed.addFields({
          name: "𝕏 Twitter",
          value: [
            `**@${profile.twitterHandle}**`,
            `**Followers:** ${profile.twitterFollowers.toLocaleString()}`,
          ].join("\n"),
          inline: true,
        });
      } else {
        statsEmbed.addFields({
          name: "𝕏 Twitter",
          value: "Not linked",
          inline: true,
        });
      }

      // Summary
      statsEmbed.addFields({
        name: "📈 Summary",
        value: [
          `**Total Views (All Platforms):** ${profile.totalViewsAllPlatforms.toLocaleString()}`,
          `**Last Updated:** ${profile.lastSyncedAt > 0 ? new Date(profile.lastSyncedAt).toLocaleString() : "Never"}`,
          isOwn ? `Use \`/social-sync\` to update your stats` : "",
        ].filter(Boolean).join("\n"),
        inline: false,
      });

      await interaction.reply({ embeds: [statsEmbed] });

      // Log action
      auditLogger.log({
        action: "creator-stats",
        executorId: userId,
        targetId: targetUser.id,
        guildId: interaction.guild?.id || "dm",
        details: { targetUsername: targetUser.username },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /creator-stats:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred retrieving creator stats.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

