import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "mimic",
  description: "Mimic selected user text",
  category: "echo",
  module: "echo",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /mimic is active (placeholder)", ephemeral: true });
  },
};

export default command;

