﻿import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";

const TICKET_TOPIC_PREFIX = "rudra-ticket";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("t-open")
    .setDescription("Open support ticket"),
  name: "t-open",
  description: "Open support ticket",
  category: "tickets",
  module: "tickets",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    const guild = interaction.guild;
    const existingTicket = guild.channels.cache.find(
      (channel) => channel.type === ChannelType.GuildText && channel.topic?.startsWith(`${TICKET_TOPIC_PREFIX}|${interaction.user.id}|`)
    );

    if (existingTicket && existingTicket.type === ChannelType.GuildText) {
      await interaction.reply({
        content: `You already have an open ticket: ${existingTicket}`,
        ephemeral: true,
      });
      return;
    }

    const ticketCategory = guild.channels.cache.find(
      (channel) => channel.type === ChannelType.GuildCategory && channel.name.toLowerCase().includes("ticket")
    );

    const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20) || "user";
    const channelName = `ticket-${safeName}`;

    try {
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketCategory?.id,
        topic: `${TICKET_TOPIC_PREFIX}|${interaction.user.id}|open|claimed=none|created=${Date.now()}`,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
          },
          {
            id: interaction.client.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory],
          },
        ],
      });

      const embed = new EmbedBuilder()
        .setColor("#6A1B9A")
        .setTitle("🎫 Ticket Opened")
        .setDescription([
          `Ticket created for ${interaction.user}.`,
          "A support channel has been created for this request.",
          "Use **/t-claim** to claim it and **/t-close** to close it.",
        ].join("\n"))
        .addFields(
          { name: "Channel", value: `${ticketChannel}`, inline: true },
          { name: "Status", value: "open", inline: true },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed] }).catch(() => null);
    } catch (error) {
      console.error("Failed to create ticket channel:", error);
      await interaction.reply({ content: "Could not create a ticket channel. Check my channel permissions.", ephemeral: true });
    }
  },
};

export default command;

