import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "verify-setup",
  description: "Setup verification system",
  category: "gateway",
  module: "gateway",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /verify-setup is active (placeholder)", ephemeral: true });
  },
};

export default command;

