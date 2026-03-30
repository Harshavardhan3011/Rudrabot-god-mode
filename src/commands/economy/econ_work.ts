import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "econ-work",
  description: "Work to earn coins",
  category: "economy",
  module: "economy",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /econ-work is active (placeholder)", ephemeral: true });
  },
};

export default command;

