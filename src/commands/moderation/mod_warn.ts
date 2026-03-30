import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "mod-warn",
  description: "Warn a member",
  category: "moderation",
  module: "moderation",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /mod-warn is active (placeholder)", ephemeral: true });
  },
};

export default command;

