import { Channel } from 'discord.js';
import { handleChannelUpdate } from '../utils/antinukeGuard';

export default {
  name: 'channelUpdate',
  async execute(oldChannel: Channel, newChannel: Channel) {
    await handleChannelUpdate(oldChannel as any, newChannel as any);
  },
};
