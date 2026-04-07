﻿import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";

const TICKET_TOPIC_PREFIX = "rudra-ticket";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("t-claim")
    .setDescription("Claim support ticket"),
  name: "t-claim",
  description: "Claim support ticket",
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
    const status = parts[2] || "open";
    const claimedByPart = parts.find((part) => part.startsWith("claimed="));
    const claimedBy = claimedByPart?.split("=")[1] || "none";

    if (status === "claimed" && claimedBy !== "none") {
      await interaction.reply({ content: `This ticket is already claimed by <@${claimedBy}>.`, ephemeral: true });
      return;
    }

    const updatedTopic = `${TICKET_TOPIC_PREFIX}|${ownerId}|claimed|claimed=${interaction.user.id}|created=${Date.now()}`;

    try {
      await interaction.channel.setTopic(updatedTopic);
      await interaction.channel.permissionOverwrites.edit(ownerId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      const embed = new EmbedBuilder()
        .setColor("#FFB300")
        .setTitle("🎫 Ticket Claimed")
        .setDescription(`This ticket has been claimed by ${interaction.user}.`)
        .addFields(
          { name: "Owner", value: `<@${ownerId}>`, inline: true },
          { name: "Claimed By", value: `${interaction.user}`, inline: true },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      await interaction.channel.send({ embeds: [embed] }).catch(() => null);
    } catch (error) {
      console.error("Failed to claim ticket:", error);
      await interaction.reply({ content: "Could not claim this ticket. Check my channel permissions.", ephemeral: true });
    }
  },
};

export default command;

