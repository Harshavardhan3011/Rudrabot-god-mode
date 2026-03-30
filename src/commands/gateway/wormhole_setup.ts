import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "wormhole-setup",
  description: "Setup wormhole sync",
  category: "gateway",
  module: "gateway",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /wormhole-setup is active (placeholder)", ephemeral: true });
  },
};

export default command;

