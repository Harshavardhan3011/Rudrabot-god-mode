import { Channel } from 'discord.js';
import { handleChannelDelete } from '../utils/antinukeGuard';

export default {
  name: 'channelDelete',
  async execute(channel: Channel) {
    await handleChannelDelete(channel as any);
  },
};
