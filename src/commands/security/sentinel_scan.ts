import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "sentinel-scan",
  description: "Run sentinel quick scan",
  category: "security",
  module: "security",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /sentinel-scan is active (placeholder)", ephemeral: true });
  },
};

export default command;

