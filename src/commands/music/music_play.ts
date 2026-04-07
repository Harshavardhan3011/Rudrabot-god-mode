import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types";
import runtimeConfigStore from "../../database/runtimeConfigStore";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("music-play")
    .setDescription("Queue a track to the guild music session")
    .addStringOption((option) =>
      option.setName("query").setDescription("Song name or URL").setRequired(true)
    ),
  name: "music-play",
  description: "Play a song",
  category: "music",
  module: "music",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
        return;
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.voice.channelId) {
        await interaction.reply({ content: "❌ Join a voice channel first.", ephemeral: true });
        return;
      }

      const query = interaction.options.getString("query", true).trim();
      if (!query) {
        await interaction.reply({ content: "❌ Provide a valid song name or URL.", ephemeral: true });
        return;
      }

      const track = {
        title: query,
        query,
        requestedBy: interaction.user.id,
        requestedAt: Date.now(),
      };

      const musicState = runtimeConfigStore.getMusicState(interaction.guild.id);
      const isIdle = !musicState.nowPlaying;
      if (isIdle) {
        musicState.nowPlaying = track;
      } else {
        musicState.queue.push(track);
      }
      runtimeConfigStore.setMusicState(interaction.guild.id, musicState);

      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle(isIdle ? "▶️ Now Playing" : "➕ Added To Queue")
        .setDescription(`**${track.title}**`)
        .addFields(
          { name: "Requested By", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Queue Length", value: String(musicState.queue.length), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in /music-play:", error);
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ Failed to queue track.", ephemeral: true });
      }
    }
  },
};

export default command;

