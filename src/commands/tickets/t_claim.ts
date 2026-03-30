import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "t-claim",
  description: "Claim support ticket",
  category: "tickets",
  module: "tickets",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /t-claim is active (placeholder)", ephemeral: true });
  },
};

export default command;

