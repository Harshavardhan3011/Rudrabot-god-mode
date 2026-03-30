import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "goodbye-setup",
  description: "Setup goodbye messages",
  category: "greeting",
  module: "greeting",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /goodbye-setup is active (placeholder)", ephemeral: true });
  },
};

export default command;

