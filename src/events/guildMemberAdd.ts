import { GuildMember } from 'discord.js';
import { EventHandler } from '../types';
import { handleGuildMemberAdd } from '../utils/antinukeGuard';

const guildMemberAddEvent: EventHandler = {
  name: 'guildMemberAdd',
  execute: async (member: GuildMember) => {
    await handleGuildMemberAdd(member).catch((error) => {
      console.error('❌ guildMemberAdd antinuke handler failed:', error);
    });
  },
};

export default guildMemberAddEvent;