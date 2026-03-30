import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "profile-card",
  description: "Create advanced profile card",
  category: "future-tech",
  module: "futuretech",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /profile-card is active (placeholder)", ephemeral: true });
  },
};

export default command;

