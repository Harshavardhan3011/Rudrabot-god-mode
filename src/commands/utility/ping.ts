import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "ping",
  description: "Check bot latency",
  category: "utility",
  module: "utility",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /ping is active (placeholder)", ephemeral: true });
  },
};

export default command;

