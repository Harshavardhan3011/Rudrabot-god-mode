import { GuildBasedChannel } from 'discord.js';
import { handleWebhookCreate, handleWebhookDelete, handleWebhookUpdate } from '../utils/antinukeGuard';

export default {
  name: 'webhooksUpdate',
  async execute(channel: GuildBasedChannel) {
    await handleWebhookCreate(channel);
    await handleWebhookDelete(channel);
    await handleWebhookUpdate(channel);
  },
};
