import { GuildBan } from 'discord.js';
import { EventHandler } from '../types';
import { handleGuildBanAdd } from '../utils/antinukeGuard';

const guildBanAddEvent: EventHandler = {
  name: 'guildBanAdd',
  execute: async (ban: GuildBan) => {
    await handleGuildBanAdd(ban).catch((error) => {
      console.error('❌ guildBanAdd antinuke handler failed:', error);
    });
  },
};

export default guildBanAddEvent;