import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "ai-chat",
  description: "Chat with Gemini AI",
  category: "ai",
  module: "ai",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /ai-chat is active (placeholder)", ephemeral: true });
  },
};

export default command;

