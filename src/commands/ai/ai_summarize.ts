import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "ai-summarize",
  description: "Summarize long content",
  category: "ai",
  module: "ai",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /ai-summarize is active (placeholder)", ephemeral: true });
  },
};

export default command;

