import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "econ-balance",
  description: "Check wallet balance",
  category: "economy",
  module: "economy",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /econ-balance is active (placeholder)", ephemeral: true });
  },
};

export default command;

