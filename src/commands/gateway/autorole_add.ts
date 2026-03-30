import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "autorole-add",
  description: "Add autorole rule",
  category: "gateway",
  module: "gateway",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /autorole-add is active (placeholder)", ephemeral: true });
  },
};

export default command;

