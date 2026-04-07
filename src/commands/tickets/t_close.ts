﻿import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";

const TICKET_TOPIC_PREFIX = "rudra-ticket";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("t-close")
    .setDescription("Close support ticket"),
  name: "t-close",
  description: "Close support ticket",
  category: "tickets",
  module: "tickets",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "This command can only be used in a server ticket channel.", ephemeral: true });
      return;
    }

    const topic = interaction.channel.topic || "";
    if (!topic.startsWith(TICKET_TOPIC_PREFIX)) {
      await interaction.reply({ content: "This channel is not marked as a ticket channel.", ephemeral: true });
      return;
    }

    const parts = topic.split("|");
    const ownerId = parts[1] || interaction.user.id;

    try {
      await interaction.channel.permissionOverwrites.edit(ownerId, {
        ViewChannel: true,
        SendMessages: false,
        ReadMessageHistory: true,
      });

      await interaction.channel.setTopic(`${TICKET_TOPIC_PREFIX}|${ownerId}|closed|closedBy=${interaction.user.id}|closedAt=${Date.now()}`);

      const closedName = interaction.channel.name.startsWith("closed-")
        ? interaction.channel.name
        : `closed-${interaction.channel.name}`.slice(0, 100);

      await interaction.channel.setName(closedName).catch(() => null);

      const embed = new EmbedBuilder()
        .setColor("#EF4444")
        .setTitle("🔒 Ticket Closed")
        .setDescription(`This ticket has been closed by ${interaction.user}.`)
        .addFields(
          { name: "Owner", value: `<@${ownerId}>`, inline: true },
          { name: "Closed By", value: `${interaction.user}`, inline: true },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      await interaction.channel.send({ embeds: [embed] }).catch(() => null);
    } catch (error) {
      console.error("Failed to close ticket:", error);
      await interaction.reply({ content: "Could not close this ticket. Check my channel permissions.", ephemeral: true });
    }
  },
};

export default command;

