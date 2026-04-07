import { Guild } from 'discord.js';
import { handleGuildUpdate } from '../utils/antinukeGuard';

export default {
  name: 'guildUpdate',
  async execute(oldGuild: Guild, newGuild: Guild) {
    await handleGuildUpdate(oldGuild, newGuild);
  },
};
