import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "welcome-setup",
  description: "Setup welcome messages",
  category: "greeting",
  module: "greeting",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /welcome-setup is active (placeholder)", ephemeral: true });
  },
};

export default command;

