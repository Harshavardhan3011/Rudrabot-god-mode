import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "expansion-docs",
  description: "Open expansion docs",
  category: "expansion",
  module: "expansion",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /expansion-docs is active (placeholder)", ephemeral: true });
  },
};

export default command;

