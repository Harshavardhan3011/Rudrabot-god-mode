import { GuildEmoji } from 'discord.js';
import { handleEmojiCreate } from '../utils/antinukeGuard';

export default {
  name: 'emojiCreate',
  async execute(emoji: GuildEmoji) {
    await handleEmojiCreate(emoji);
  },
};
