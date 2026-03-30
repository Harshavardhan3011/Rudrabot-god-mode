import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "server-info",
  description: "Show server information",
  category: "utility",
  module: "utility",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /server-info is active (placeholder)", ephemeral: true });
  },
};

export default command;

