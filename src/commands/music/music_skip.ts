import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import runtimeConfigStore from "../../database/runtimeConfigStore";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("music-skip")
    .setDescription("Skip current track"),
  name: "music-skip",
  description: "Skip current song",
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
        await interaction.reply({ content: "❌ Join a voice channel to skip tracks.", ephemeral: true });
        return;
      }

      const musicState = runtimeConfigStore.getMusicState(interaction.guild.id);
      if (!musicState.nowPlaying) {
        await interaction.reply({ content: "📭 Nothing is currently playing.", ephemeral: true });
        return;
      }

      const skippedTitle = musicState.nowPlaying.title;
      musicState.nowPlaying = musicState.queue.shift() || null;
      runtimeConfigStore.setMusicState(interaction.guild.id, musicState);

      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle("⏭️ Track Skipped")
        .addFields(
          { name: "Skipped", value: skippedTitle, inline: false },
          {
            name: "Now Playing",
            value: musicState.nowPlaying ? musicState.nowPlaying.title : "Nothing",
            inline: false,
          }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in /music-skip:", error);
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ Failed to skip track.", ephemeral: true });
      }
    }
  },
};

export default command;

