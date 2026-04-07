import { Sticker } from 'discord.js';
import { handleStickerDelete } from '../utils/antinukeGuard';

export default {
  name: 'stickerDelete',
  async execute(sticker: Sticker) {
    await handleStickerDelete(sticker);
  },
};
