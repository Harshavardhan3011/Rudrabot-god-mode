import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "social-sync",
  description: "Run social sync",
  category: "creator",
  module: "creator",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /social-sync is active (placeholder)", ephemeral: true });
  },
};

export default command;

