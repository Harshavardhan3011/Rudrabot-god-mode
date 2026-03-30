import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "ai-image",
  description: "Generate an AI image",
  category: "ai",
  module: "ai",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /ai-image is active (placeholder)", ephemeral: true });
  },
};

export default command;

