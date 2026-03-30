import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "mod-mute",
  description: "Mute a member",
  category: "moderation",
  module: "moderation",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /mod-mute is active (placeholder)", ephemeral: true });
  },
};

export default command;

