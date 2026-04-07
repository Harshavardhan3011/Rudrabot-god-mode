﻿import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, ChannelType } from "discord.js";
import { Command } from "../../types";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("server-info")
    .setDescription("Show comprehensive server information"),

  name: "server-info",
  description: "Show server information",
  category: "utility",
  module: "utility",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (10 seconds per guild)
      const guildKey = `serverinfo-${interaction.guild?.id}`;
      const cooldownExpires = cooldowns.get(guildKey);
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ Command on cooldown. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      cooldowns.set(guildKey, now + 10000);

      if (!interaction.guild) {
        await interaction.reply({
          content: "❌ This command only works in guilds.",
          ephemeral: true,
        });
        return;
      }

      // Defer reply for data gathering
      await interaction.deferReply();

      const guild = interaction.guild;
      const owner = await guild.fetchOwner().catch(() => null);

      // Gather server statistics
      const memberCount = guild.memberCount;
      const botCount = (await guild.members.fetch()).filter(m => m.user.bot).size;
      const humanCount = memberCount - botCount;

      // Channel statistics
      const channels = await guild.channels.fetch();
      const textChannels = channels.filter(c => c?.type === ChannelType.GuildText).size;
      const voiceChannels = channels.filter(c => c?.type === ChannelType.GuildVoice).size;
      const categoryChannels = channels.filter(c => c?.type === ChannelType.GuildCategory).size;

      // Role statistics
      const roles = guild.roles.cache.size;

      // Format dates
      const createdDate = guild.createdAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      const joinedDate = guild.joinedAt?.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }) || "Unknown";

      // Verification level mapping
      const verificationLevels: Record<number, string> = {
        0: "None",
        1: "Low",
        2: "Medium",
        3: "High",
        4: "Very High",
      };

      // Build main embed
      const embed = new EmbedBuilder()
        .setColor(0x3B82F6)
        .setTitle(`📊 ${guild.name} Server Info`)
        .setThumbnail(guild.iconURL({ size: 256 }) || null)
        .addFields(
          {
            name: "👑 Owner",
            value: owner ? `${owner.user.tag} (${owner.id})` : "Unknown",
            inline: true,
          },
          {
            name: "📅 Created",
            value: createdDate,
            inline: true,
          },
          {
            name: "🤖 Bot Joined",
            value: joinedDate,
            inline: true,
          },
          {
            name: "👥 Members",
            value: [
              `Total: **${memberCount}**`,
              `Humans: **${humanCount}**`,
              `Bots: **${botCount}**`,
            ].join("\n"),
            inline: true,
          },
          {
            name: "🗂️ Channels",
            value: [
              `Text: **${textChannels}**`,
              `Voice: **${voiceChannels}**`,
              `Categories: **${categoryChannels}**`,
            ].join("\n"),
            inline: true,
          },
          {
            name: "🏷️ Roles",
            value: `**${roles}** total`,
            inline: true,
          },
          {
            name: "⚙️ Security",
            value: [
              `Verification: **${verificationLevels[guild.verificationLevel] || "Unknown"}**`,
              `Explicit Content: **${guild.explicitContentFilter === 0 ? "Disabled" : guild.explicitContentFilter === 1 ? "Members" : "All"}**`,
            ].join("\n"),
            inline: false,
          }
        )
        .setFooter({ text: `Server ID: ${guild.id}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "server-info",
        executorId: userId,
        guildId: guild.id,
        guildName: guild.name,
        details: {
          memberCount,
          channelCount: channels.size,
          roleCount: roles,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /server-info:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred fetching server information.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

