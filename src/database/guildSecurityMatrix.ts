import DatabaseHandler from './dbHandler';
import { GuildData } from '../types';

const db = new DatabaseHandler(
  process.env.DATABASE_PATH || './src/database/rudra_main.sqlite'
);

export const ANTI_NUKE_FLAG_KEYS = [
  'antiBan',
  'antiKick',
  'antiBotAdd',
  'antiAltJoin',
  'antiMassMention',
  'antiSpam',
  'antiLink',
  'antiInvite',
  'antiZalgo',
  'antiCaps',
  'antiChannelCreate',
  'antiChannelDelete',
  'antiChannelUpdate',
  'antiVcJoin',
  'antiThreadCreate',
  'antiThreadDelete',
  'antiWebhookCreate',
  'antiWebhookDelete',
  'antiWebhookUpdate',
  'antiPins',
  'antiRoleCreate',
  'antiRoleDelete',
  'antiRoleUpdate',
  'antiPermsUpdate',
  'antiIntegrationAdd',
  'antiEmojiCreate',
  'antiEmojiDelete',
  'antiStickerCreate',
  'antiStickerDelete',
  'antiVanitySteal',
  'antiServerUpdate',
  'antiPrune',
  'antiWidgetUpdate',
  'antiCommunityUpdate',
  'antiDiscoveryUpdate',
  'antiRaidMode',
  'antiTokenGrabber',
  'antiPhishing',
  'antiIpLogger',
  'antiCrashVideo',
  'antiNukeBypass',
  'strictMode',
  'ghostPingDetector',
  'panicLockdown',
] as const;

function createDefaultGuildData(guildId: string, guildName: string, ownerId: string): GuildData {
  return {
    guildId,
    guildName,
    ownerId,
    inviterId: ownerId,
    vipMembers: [ownerId],
    modules: {
      antinuke: false,
      sentinelScan: false,
      moderation: false,
      tickets: false,
      economy: false,
      music: false,
      jtcVoice: false,
      welcome: false,
      logging: false,
    },
    channels: {},
    roles: {},
    antinuke: {
      antiBan: false,
      antiKick: false,
      antiBotAdd: false,
      antiAltJoin: false,
      antiMassMention: false,
      antiSpam: false,
      antiLink: false,
      antiInvite: false,
      antiZalgo: false,
      antiCaps: false,
      strictMode: false,
      panicLockdown: false,
    },
    whitelist: [],
    moderation: {
      automodEnabled: false,
      profanityFilter: false,
      linkFilter: false,
      nsfwImageScan: false,
      zalgoFilter: false,
      spamThreshold: 5,
      automuteTime: 60,
    },
    welcome: {
      enabled: false,
      embedEnabled: false,
      dmEnabled: false,
      cardEnabled: false,
    },
    economy: {
      enabled: false,
      dailyReward: 0,
      weeklyReward: 0,
      monthlyReward: 0,
      taxRate: 0,
      casinoEnabled: false,
    },
    music: {
      enabled: false,
      defaultVolume: 50,
      djRoleRequired: false,
      defaultAutoplay: false,
    },
    inviteTracking: {
      enabled: false,
      fakeInviteAction: 'ignore',
      fakeInviteDelay: 0,
    },
    triggers: [],
    isPremium: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function getOrCreateGuildData(guildId: string, guildName: string, ownerId: string): Promise<any> {
  const existing = await db.getGuild(guildId);
  if (existing) {
    let mutated = false;

    if ((existing as any).antinuke?.antiDan !== undefined && (existing as any).antinuke.antiBan === undefined) {
      (existing as any).antinuke.antiBan = Boolean((existing as any).antinuke.antiDan);
      delete (existing as any).antinuke.antiDan;
      mutated = true;
    }

    if (!(existing as any).inviterId) {
      (existing as any).inviterId = (existing as any).ownerId || ownerId;
      mutated = true;
    }

    if (!Array.isArray((existing as any).vipMembers)) {
      (existing as any).vipMembers = [];
      mutated = true;
    }

    if (mutated) {
      await db.setGuild(guildId, existing as GuildData).catch(() => null);
    }

    return existing as any;
  }
  return createDefaultGuildData(guildId, guildName, ownerId) as any;
}

export async function saveGuildData(guildId: string, guildData: any): Promise<boolean> {
  guildData.updatedAt = Date.now();
  return db.setGuild(guildId, guildData as GuildData);
}

export function buildAntiNukeMatrix(enabled: boolean): Record<string, boolean> {
  const matrix: Record<string, boolean> = {};
  for (const key of ANTI_NUKE_FLAG_KEYS) {
    matrix[key] = enabled;
  }
  return matrix;
}
