import { VoiceState } from 'discord.js';
import { getOrCreateGuildData } from '../database/guildSecurityMatrix';
import { handleVoiceStateUpdate } from '../utils/antinukeGuard';

export default {
  name: 'voiceStateUpdate',
  async execute(oldState: VoiceState, newState: VoiceState) {
    // Check database toggles before enforcing anti-VC rules
    if (!newState.guild) return;

    try {
      const guildData = await getOrCreateGuildData(
        newState.guild.id,
        newState.guild.name,
        newState.guild.ownerId
      );

      // Initialize toggles if not present
      if (!guildData.antiVcToggles) {
        guildData.antiVcToggles = {
          antiVcJoin: false,
          antiVcLeave: false,
        };
      }

      // Check if anti-VC join is enabled (user joining VC)
      const userJoined = !oldState.channel && newState.channel;
      if (userJoined && !guildData.antiVcToggles.antiVcJoin) {
        // Anti-VC Join is OFF, allow connection
        return;
      }

      // Check if anti-VC leave is enabled (user leaving VC)
      const userLeft = oldState.channel && !newState.channel;
      if (userLeft && !guildData.antiVcToggles.antiVcLeave) {
        // Anti-VC Leave is OFF, allow disconnection
        return;
      }

      // If toggles are enabled, run the antinuke guard handler
      await handleVoiceStateUpdate(oldState, newState);
    } catch (error) {
      console.error('Error checking antiVC toggles:', error);
      // Fail safely - still run the handler if DB check fails
      await handleVoiceStateUpdate(oldState, newState);
    }
  },
};
