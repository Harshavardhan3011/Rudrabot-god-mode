import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types";

const command: Command = {
  name: "vip-grant",
  description: "Grant VIP role access",
  category: "owner",
  module: "owner",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: "[RUDRA.0x] /vip-grant is active (placeholder)", ephemeral: true });
  },
};

export default command;

