import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "invite-tracker",
  description: "Enable invite tracker",
  category: "greeting",
  module: "greeting",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /invite-tracker is active (placeholder)", ephemeral: true });
  },
};

export default command;

