import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import runtimeConfigStore from "../../database/runtimeConfigStore";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("music-queue")
    .setDescription("Show current music queue"),
  name: "music-queue",
  description: "Show music queue",
  category: "music",
  module: "music",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
        return;
      }

      const musicState = runtimeConfigStore.getMusicState(interaction.guild.id);
      if (!musicState.nowPlaying && musicState.queue.length === 0) {
        await interaction.reply({ content: "📭 Queue is empty.", ephemeral: true });
        return;
      }

      const queueLines = musicState.queue.slice(0, 10).map((track, index) => {
        return `${index + 1}. ${track.title} • <@${track.requestedBy}>`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle("🎵 Music Queue")
        .addFields(
          {
            name: "Now Playing",
            value: musicState.nowPlaying
              ? `${musicState.nowPlaying.title} • <@${musicState.nowPlaying.requestedBy}>`
              : "Nothing",
            inline: false,
          },
          {
            name: `Up Next (${musicState.queue.length})`,
            value: queueLines.length ? queueLines.join("\n") : "No queued tracks",
            inline: false,
          }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in /music-queue:", error);
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ Failed to fetch queue.", ephemeral: true });
      }
    }
  },
};

export default command;

