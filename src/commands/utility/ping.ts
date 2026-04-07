﻿import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),

  name: "ping",
  description: "Check bot latency",
  category: "utility",
  module: "utility",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (3 seconds per user)
      const cooldownExpires = cooldowns.get(userId);
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ Command on cooldown. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      cooldowns.set(userId, now + 3000);

      // Measure bot latency
      const sentAt = Date.now();
      const reply = await interaction.reply({ 
        content: "🏓 Pinging...", 
        ephemeral: true,
        fetchReply: true,
      });
      const roundTrip = Date.now() - sentAt;
      const wsLatency = interaction.client.ws.ping;

      // Build response embed
      const embed = new EmbedBuilder()
        .setColor(wsLatency < 100 ? 0x10B981 : wsLatency < 250 ? 0xF59E0B : 0xEF4444)
        .setTitle("🏓 Pong!")
        .addFields(
          {
            name: "WebSocket Latency",
            value: `${wsLatency}ms`,
            inline: true,
          },
          {
            name: "Round Trip",
            value: `${roundTrip}ms`,
            inline: true,
          },
          {
            name: "Status",
            value: wsLatency < 100 ? "🟢 Excellent" : wsLatency < 250 ? "🟡 Good" : "🔴 High",
            inline: true,
          }
        )
        .setFooter({ text: "RUDRA.0x Network Status" })
        .setTimestamp();

      await interaction.editReply({ content: " ", embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "ping",
        executorId: userId,
        guildId: interaction.guild?.id || "dm",
        guildName: interaction.guild?.name || "DM",
        details: {
          wsLatency,
          roundTrip,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /ping:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred checking latency.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

