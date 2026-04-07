import { Sticker } from 'discord.js';
import { handleStickerCreate } from '../utils/antinukeGuard';

export default {
  name: 'stickerCreate',
  async execute(sticker: Sticker) {
    await handleStickerCreate(sticker);
  },
};
