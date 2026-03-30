import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "owner-eval",
  description: "Evaluate secured script",
  category: "owner",
  module: "owner",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /owner-eval is active (placeholder)", ephemeral: true });
  },
};

export default command;

