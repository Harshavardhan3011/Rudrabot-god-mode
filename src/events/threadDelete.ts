import { ThreadChannel } from 'discord.js';
import { handleThreadDelete } from '../utils/antinukeGuard';

export default {
  name: 'threadDelete',
  async execute(thread: ThreadChannel) {
    await handleThreadDelete(thread);
  },
};
