import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "music-queue",
  description: "Show music queue",
  category: "music",
  module: "music",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /music-queue is active (placeholder)", ephemeral: true });
  },
};

export default command;

