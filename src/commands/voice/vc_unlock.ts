import { ChannelType, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { Command } from "../../types";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("vc-unlock")
    .setDescription("Unlock your current voice channel"),

  name: "vc-unlock",
  description: "Unlock current voice channel",
  category: "voice",
  module: "voice",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (8 seconds per user)
      const cooldownExpires = cooldowns.get(userId);
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ Command on cooldown. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      cooldowns.set(userId, now + 8000);

      if (!interaction.guild || !interaction.member) {
        await interaction.reply({
          content: "❌ This command can only be used in a guild.",
          ephemeral: true,
        });
        return;
      }

      // Check if member is in voice channel
      const guild = interaction.guild;
      const member = interaction.member as any;
      const voiceChannel = member.voice?.channel;

      if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        await interaction.reply({
          content: "❌ You must be in a voice channel to use this command.",
          ephemeral: true,
        });
        return;
      }

      // Check if user is channel owner or has Manage Channels permission
      const isOwner = voiceChannel.ownerId === userId;
      const canManage = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);

      if (!isOwner && !canManage) {
        await interaction.reply({
          content: "❌ You must own this voice channel or have `Manage Channels` permission.",
          ephemeral: true,
        });
        return;
      }

      // Check if already unlocked
      const memberLocked = voiceChannel.permissionOverwrites.cache.has(guild.roles.everyone.id);
      if (!memberLocked) {
        await interaction.reply({
          content: "❌ This voice channel is already unlocked.",
          ephemeral: true,
        });
        return;
      }

      const everyoneOverwrite = voiceChannel.permissionOverwrites.cache.get(guild.roles.everyone.id);
      if (!everyoneOverwrite?.deny.has(PermissionFlagsBits.Connect)) {
        await interaction.reply({
          content: "❌ This voice channel is already unlocked.",
          ephemeral: true,
        });
        return;
      }

      // Unlock the channel (remove Connect denial for @everyone)
      await voiceChannel.permissionOverwrites.edit(
        guild.roles.everyone,
        {
          Connect: null, // Reset to inherit
        },
        { reason: `VC Unlocked by ${interaction.user.tag}` }
      );

      // Build response embed
      const embed = new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle("🔓 Voice Channel Unlocked")
        .addFields(
          {
            name: "Channel",
            value: `<#${voiceChannel.id}>`,
            inline: true,
          },
          {
            name: "Status",
            value: "🟢 UNLOCKED - New members can join",
            inline: true,
          },
          {
            name: "Members Inside",
            value: `${voiceChannel.members.size} member(s)`,
            inline: true,
          },
          {
            name: "💡 Note",
            value: "The channel is now open to everyone. Use `/vc-lock` to restrict access.",
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x Voice System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "vc-unlock",
        executorId: userId,
        guildId: guild.id,
        guildName: guild.name,
        details: {
          channelId: voiceChannel.id,
          channelName: voiceChannel.name,
          membersInside: voiceChannel.members.size,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /vc-unlock:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred unlocking the voice channel.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;


