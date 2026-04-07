import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, ChannelType } from "discord.js";
import { Command } from "../../types";
import DatabaseHandler from "../../database/dbHandler";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("welcome-setup")
    .setDescription("Setup welcome messages for new members")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("Channel for welcome messages")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Welcome message (use {user} for mention, {guild} for server name)")
        .setRequired(true)
        .setMaxLength(1000)
    )
    .addBooleanOption(option =>
      option.setName("dm")
        .setDescription("Also send DM to new members")
        .setRequired(false)
    ),

  name: "welcome-setup",
  description: "Setup welcome messages",
  category: "greeting",
  module: "greeting",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (15 seconds per guild)
      const guildKey = `welcome-${interaction.guild?.id}`;
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

      const channel = interaction.options.getChannel("channel", true);
      const message = interaction.options.getString("message", true);
      const dmEnabled = interaction.options.getBoolean("dm") || false;

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

      // Update welcome settings
      if (!guildData.welcome) {
        guildData.welcome = {
          enabled: true,
          channel: channel.id,
          message,
          embedEnabled: false,
          dmEnabled,
          cardEnabled: false,
        };
      } else {
        guildData.welcome.enabled = true;
        guildData.welcome.channel = channel.id;
        guildData.welcome.message = message;
        guildData.welcome.dmEnabled = dmEnabled;
      }

      guildData.updatedAt = now;

      // Save to database
      const saved = await db.setGuild(interaction.guild.id, guildData);
      if (!saved) {
        await interaction.reply({
          content: "❌ Failed to save welcome settings.",
          ephemeral: true,
        });
        return;
      }

      // Build response embed
      const embed = new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle("✅ Welcome Setup Complete")
        .addFields(
          {
            name: "📢 Channel",
            value: `<#${channel.id}>`,
            inline: true,
          },
          {
            name: "💬 Message Preview",
            value: message.length > 256 ? message.slice(0, 253) + "..." : message,
            inline: false,
          },
          {
            name: "⚙️ Settings",
            value: [
              `✅ Welcome Messages: Enabled`,
              `${dmEnabled ? "✅" : "❌"} DM to members: ${dmEnabled ? "Enabled" : "Disabled"}`,
            ].join("\n"),
            inline: false,
          },
          {
            name: "💡 Variables",
            value: "{user} = Member mention\n{guild} = Server name\n{count} = Member count",
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x Greeting System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "welcome-setup",
        executorId: userId,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        details: { 
          channel: channel.id,
          dmEnabled,
          messageLength: message.length,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /welcome-setup:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred setting up welcome messages.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

