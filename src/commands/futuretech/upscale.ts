import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "upscale",
  description: "Upscale generated image",
  category: "future-tech",
  module: "futuretech",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /upscale is active (placeholder)", ephemeral: true });
  },
};

export default command;

