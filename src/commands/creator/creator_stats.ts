import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "creator-stats",
  description: "Show creator performance stats",
  category: "creator",
  module: "creator",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /creator-stats is active (placeholder)", ephemeral: true });
  },
};

export default command;

