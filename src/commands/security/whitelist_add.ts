import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "whitelist-add",
  description: "Add a user to whitelist",
  category: "security",
  module: "security",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /whitelist-add is active (placeholder)", ephemeral: true });
  },
};

export default command;

