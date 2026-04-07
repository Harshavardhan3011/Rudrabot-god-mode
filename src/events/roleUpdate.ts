import { Role } from 'discord.js';
import { handleRoleUpdate } from '../utils/antinukeGuard';

export default {
  name: 'roleUpdate',
  async execute(oldRole: Role, newRole: Role) {
    await handleRoleUpdate(oldRole, newRole);
  },
};
