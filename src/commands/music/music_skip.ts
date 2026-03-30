import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "music-skip",
  description: "Skip current song",
  category: "music",
  module: "music",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /music-skip is active (placeholder)", ephemeral: true });
  },
};

export default command;

