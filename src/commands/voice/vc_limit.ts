import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { Command } from "../../types";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("vc-limit")
    .setDescription("Adjust your current voice channel user limit")
    .addIntegerOption(option =>
      option.setName("limit")
        .setDescription("User limit (0 = unlimited, 1-99 = specific limit)")
        .setMinValue(0)
        .setMaxValue(99)
        .setRequired(true)
    ),

  name: "vc-limit",
  description: "Set voice user limit",
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

      const limit = interaction.options.getInteger("limit", true);

      // Validate limit doesn't exceed current members
      if (limit > 0 && limit < voiceChannel.members.size) {
        await interaction.reply({
          content: `❌ The limit (${limit}) cannot be less than current members (${voiceChannel.members.size}).`,
          ephemeral: true,
        });
        return;
      }

      // Update the channel user limit
      const oldLimit = voiceChannel.userLimit;
      await voiceChannel.setUserLimit(limit, `VC Limit set by ${interaction.user.tag}`);

      // Build response embed
      const embed = new EmbedBuilder()
        .setColor(0x3B82F6)
        .setTitle("👥 Voice Channel Limit Updated")
        .addFields(
          {
            name: "Channel",
            value: `<#${voiceChannel.id}>`,
            inline: true,
          },
          {
            name: "Previous Limit",
            value: oldLimit === 0 ? "Unlimited" : `${oldLimit} members`,
            inline: true,
          },
          {
            name: "New Limit",
            value: limit === 0 ? "🔓 Unlimited" : `👥 ${limit} members`,
            inline: true,
          },
          {
            name: "Current Members",
            value: `${voiceChannel.members.size} / ${limit === 0 ? "∞" : limit}`,
            inline: true,
          },
          {
            name: "💡 Info",
            value: "• 0 = No limit (anyone can join)\n• 1-99 = Specific member cap",
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x Voice System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "vc-limit",
        executorId: userId,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        details: {
          channelId: voiceChannel.id,
          channelName: voiceChannel.name,
          previousLimit: oldLimit,
          newLimit: limit,
          currentMembers: voiceChannel.members.size,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /vc-limit:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred setting the voice channel limit.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

