import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "echo-add",
  description: "Add auto reply trigger",
  category: "echo",
  module: "echo",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /echo-add is active (placeholder)", ephemeral: true });
  },
};

export default command;

