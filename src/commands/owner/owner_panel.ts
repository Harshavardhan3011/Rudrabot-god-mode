import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import permissionValidator from "../../utils/permissionValidator";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("owner-panel")
    .setDescription("View owner-only operational panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  name: "owner-panel",
  description: "Open owner control panel",
  category: "owner",
  module: "owner",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      if (!permissionValidator.isOwner(interaction.user.id)) {
        await interaction.reply({ content: "❌ Owner only command.", ephemeral: true });
        return;
      }

      const client = interaction.client;
      const commandHandler = (global as any).commandHandler;
      const commandCount = commandHandler?.getCommandCount ? commandHandler.getCommandCount() : 0;
      const uptimeMs = client.uptime || 0;
      const memoryMb = Math.round(process.memoryUsage().rss / (1024 * 1024));

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle("👑 RUDRA.0x Owner Panel")
        .addFields(
          { name: "Guilds", value: String(client.guilds.cache.size), inline: true },
          { name: "Cached Users", value: String(client.users.cache.size), inline: true },
          { name: "Loaded Commands", value: String(commandCount), inline: true },
          { name: "Uptime", value: `${Math.floor(uptimeMs / 1000)}s`, inline: true },
          { name: "Memory", value: `${memoryMb} MB RSS`, inline: true },
          { name: "Node", value: process.version, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error("Error in /owner-panel:", error);
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ Failed to open owner panel.", ephemeral: true });
      }
    }
  },
};

export default command;

