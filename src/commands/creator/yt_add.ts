import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "yt-add",
  description: "Link a YouTube channel",
  category: "creator",
  module: "creator",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /yt-add is active (placeholder)", ephemeral: true });
  },
};

export default command;

