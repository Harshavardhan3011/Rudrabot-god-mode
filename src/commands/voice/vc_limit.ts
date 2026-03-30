import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "vc-limit",
  description: "Set voice user limit",
  category: "voice",
  module: "voice",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /vc-limit is active (placeholder)", ephemeral: true });
  },
};

export default command;

