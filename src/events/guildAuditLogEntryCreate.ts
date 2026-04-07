import { Guild } from 'discord.js';
import { handleAuditLogEntryCreate } from '../utils/antinukeGuard';

export default {
  name: 'guildAuditLogEntryCreate',
  async execute(entry: any, guild: Guild) {
    await handleAuditLogEntryCreate(entry, guild);
  },
};
