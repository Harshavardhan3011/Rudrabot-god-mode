import { ThreadChannel } from 'discord.js';
import { handleThreadCreate } from '../utils/antinukeGuard';

export default {
  name: 'threadCreate',
  async execute(thread: ThreadChannel) {
    await handleThreadCreate(thread);
  },
};
