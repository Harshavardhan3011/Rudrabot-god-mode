import { Channel } from 'discord.js';
import { handleChannelCreate } from '../utils/antinukeGuard';

export default {
  name: 'channelCreate',
  async execute(channel: Channel) {
    await handleChannelCreate(channel as any);
  },
};
