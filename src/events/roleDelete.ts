import { Role } from 'discord.js';
import { handleRoleDelete } from '../utils/antinukeGuard';

export default {
  name: 'roleDelete',
  async execute(role: Role) {
    await handleRoleDelete(role);
  },
};
