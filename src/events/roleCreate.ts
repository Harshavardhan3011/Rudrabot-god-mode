import { Role } from 'discord.js';
import { handleRoleCreate } from '../utils/antinukeGuard';

export default {
  name: 'roleCreate',
  async execute(role: Role) {
    await handleRoleCreate(role);
  },
};
