import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "react-add",
  description: "Add auto reaction rule",
  category: "echo",
  module: "echo",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /react-add is active (placeholder)", ephemeral: true });
  },
};

export default command;

