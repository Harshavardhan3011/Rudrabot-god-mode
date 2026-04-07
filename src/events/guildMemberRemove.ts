import { GuildMember } from 'discord.js';
import { EventHandler } from '../types';
import { handleGuildMemberRemove } from '../utils/antinukeGuard';

const guildMemberRemoveEvent: EventHandler = {
  name: 'guildMemberRemove',
  execute: async (member: GuildMember) => {
    await handleGuildMemberRemove(member).catch((error) => {
      console.error('❌ guildMemberRemove antinuke handler failed:', error);
    });
  },
};

export default guildMemberRemoveEvent;