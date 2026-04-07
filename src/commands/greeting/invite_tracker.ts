import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import DatabaseHandler from "../../database/dbHandler";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();
const inviteTracking = new Map<string, Map<string, number>>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("invite-tracker")
    .setDescription("Enable/disable invite tracking")
    .addBooleanOption(option =>
      option.setName("enable")
        .setDescription("Enable or disable tracking")
        .setRequired(true)
    ),

  name: "invite-tracker",
  description: "Enable invite tracker",
  category: "greeting",
  module: "greeting",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (15 seconds per guild)
      const guildKey = `invitetracker-${interaction.guild?.id}`;
      const cooldownExpires = cooldowns.get(guildKey);
      
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ Command on cooldown. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      cooldowns.set(guildKey, now + 15000);

      if (!interaction.guild) {
        await interaction.reply({
          content: "❌ This command only works in guilds.",
          ephemeral: true,
        });
        return;
      }

      // Check permissions
      if (!interaction.memberPermissions?.has("ManageGuild")) {
        await interaction.reply({
          content: "❌ You need `Manage Guild` permission.",
          ephemeral: true,
        });
        return;
      }

      const enable = interaction.options.getBoolean("enable", true);

      // Get database
      const db = (global as any).db as DatabaseHandler | undefined;
      if (!db) {
        await interaction.reply({
          content: "❌ Database unavailable.",
          ephemeral: true,
        });
        return;
      }

      // Fetch guild data
      const guildData = await db.getGuild(interaction.guild.id);
      if (!guildData) {
        await interaction.reply({
          content: "❌ Guild not initialized.",
          ephemeral: true,
        });
        return;
      }

      // Initialize invite tracking if needed
      if (!guildData.inviteTracking) {
        guildData.inviteTracking = {
          enabled: false,
          fakeInviteAction: "kick",
          fakeInviteDelay: 7,
          leaderboardChannel: undefined,
        };
      }

      // Store current state
      const wasEnabled = guildData.inviteTracking.enabled;

      // Update invite tracking settings
      guildData.inviteTracking.enabled = enable;
      guildData.updatedAt = now;

      // Initialize runtime tracking if enabled
      if (enable && !inviteTracking.has(interaction.guild.id)) {
        inviteTracking.set(interaction.guild.id, new Map());
      } else if (!enable) {
        inviteTracking.delete(interaction.guild.id);
      }

      // Save to database
      const saved = await db.setGuild(interaction.guild.id, guildData);
      if (!saved) {
        await interaction.reply({
          content: "❌ Failed to save invite tracking settings.",
          ephemeral: true,
        });
        return;
      }

      // Fetch invites if enabling
      let inviteCount = 0;
      if (enable) {
        try {
          const invites = await interaction.guild.invites.fetch();
          inviteCount = invites.size;
          
          // Store invite codes for comparison later
          const inviteMap = inviteTracking.get(interaction.guild.id) || new Map();
          invites.forEach(invite => {
            inviteMap.set(invite.code, invite.uses || 0);
          });
          inviteTracking.set(interaction.guild.id, inviteMap);
        } catch (inviteError) {
          console.warn("⚠️ Could not fetch invites:", inviteError);
        }
      }

      // Build response embed
      const embed = new EmbedBuilder()
        .setColor(enable ? 0x10B981 : 0xEF4444)
        .setTitle(enable ? "✅ Invite Tracker Enabled" : "✅ Invite Tracker Disabled")
        .addFields(
          {
            name: "📊 Status",
            value: enable ? "🟢 ACTIVE" : "🔴 INACTIVE",
            inline: true,
          },
          {
            name: "📈 Tracking",
            value: enable ? `Monitoring **${inviteCount}** invite codes` : "Not tracking invites",
            inline: true,
          },
          {
            name: "⚙️ Defense",
            value: enable
              ? [
                  `✅ Alt Account Detection: Enabled`,
                  `✅ Fake Invite Detection: Enabled`,
                  `✅ Join Pattern Analysis: Enabled`,
                ].join("\n")
              : "All defense features disabled",
            inline: false,
          },
          {
            name: "💡 What it tracks",
            value: enable
              ? "• Invite usage per member\n• New invite creations\n• Suspicious join patterns\n• Fake invites (non-existent)"
              : "Waiting to be enabled",
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x Invite Tracking System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "invite-tracker",
        executorId: userId,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        details: { 
          enabled: enable,
          wasEnabled,
          inviteCount,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /invite-tracker:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred setting up invite tracking.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

