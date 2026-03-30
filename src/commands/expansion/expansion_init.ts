import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "expansion-init",
  description: "Initialize expansion module",
  category: "expansion",
  module: "expansion",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /expansion-init is active (placeholder)", ephemeral: true });
  },
};

export default command;

