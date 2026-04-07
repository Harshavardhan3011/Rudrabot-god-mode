import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, ChannelType } from "discord.js";
import { Command } from "../../types";
import DatabaseHandler from "../../database/dbHandler";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("goodbye-setup")
    .setDescription("Setup goodbye messages for members leaving")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("Channel for goodbye messages")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Goodbye message (use {user} for name, {guild} for server name)")
        .setRequired(true)
        .setMaxLength(1000)
    ),

  name: "goodbye-setup",
  description: "Setup goodbye messages",
  category: "greeting",
  module: "greeting",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (15 seconds per guild)
      const guildKey = `goodbye-${interaction.guild?.id}`;
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

      // Initialize goodbye object if needed
      if (!guildData.goodbye) {
        guildData.goodbye = {
          enabled: false,
          channel: "",
          message: "",
        };
      }

      // Update goodbye settings
      guildData.goodbye.enabled = true;
      guildData.goodbye.channel = channel.id;
      guildData.goodbye.message = message;
      guildData.updatedAt = now;

      // Save to database
      const saved = await db.setGuild(interaction.guild.id, guildData);
      if (!saved) {
        await interaction.reply({
          content: "❌ Failed to save goodbye settings.",
          ephemeral: true,
        });
        return;
      }

      // Build response embed
      const embed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle("✅ Goodbye Setup Complete")
        .addFields(
          {
            name: "📢 Channel",
            value: `<#${channel.id}>`,
            inline: true,
          },
          {
            name: "👋 Message Preview",
            value: message.length > 256 ? message.slice(0, 253) + "..." : message,
            inline: false,
          },
          {
            name: "⚙️ Settings",
            value: `✅ Goodbye Messages: Enabled\n✅ Will notify when members leave`,
            inline: false,
          },
          {
            name: "💡 Variables",
            value: "{user} = Member name\n{guild} = Server name",
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x Greeting System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "goodbye-setup",
        executorId: userId,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        details: { 
          channel: channel.id,
          messageLength: message.length,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /goodbye-setup:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred setting up goodbye messages.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

