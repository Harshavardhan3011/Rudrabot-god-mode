import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "vc-unlock",
  description: "Unlock current voice channel",
  category: "voice",
  module: "voice",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /vc-unlock is active (placeholder)", ephemeral: true });
  },
};

export default command;

