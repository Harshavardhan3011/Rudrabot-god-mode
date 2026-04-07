import { TextChannel } from 'discord.js';
import { handleChannelPinsUpdate } from '../utils/antinukeGuard';

export default {
  name: 'channelPinsUpdate',
  async execute(channel: TextChannel) {
    await handleChannelPinsUpdate(channel);
  },
};
