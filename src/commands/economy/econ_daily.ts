import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "econ-daily",
  description: "Claim daily reward",
  category: "economy",
  module: "economy",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /econ-daily is active (placeholder)", ephemeral: true });
  },
};

export default command;

