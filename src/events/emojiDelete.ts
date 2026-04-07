import { GuildEmoji } from 'discord.js';
import { handleEmojiDelete } from '../utils/antinukeGuard';

export default {
  name: 'emojiDelete',
  async execute(emoji: GuildEmoji) {
    await handleEmojiDelete(emoji);
  },
};
