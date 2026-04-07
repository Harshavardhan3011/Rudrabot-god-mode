import vipHandler from '../database/vipHandler';

const FALLBACK_OWNER_IDS = new Set<string>([
  '1344818916266086531',
  '970124037621678100',
]);

function getOwnerIds(): Set<string> {
  return new Set<string>(
    [
      ...(process.env.BOT_OWNERS || '').split(',').map((id) => id.trim()).filter(Boolean),
      process.env.BOT_OWNER_ID || '',
      process.env.ASHU_ID || '',
      process.env.ZORO_ID || '',
      ...Array.from(FALLBACK_OWNER_IDS),
    ].filter(Boolean)
  );
}

export enum AccessLevel {
  NORMAL_USER = 0,
  VIP = 1,
  VIP_PRTR = 2,
  OWNER = 3,
}

export function getAccessLevel(userId: string): AccessLevel {
  if (getOwnerIds().has(userId)) {
    return AccessLevel.OWNER;
  }

  const vipTier = vipHandler.getTier(userId);
  if (vipTier === 'VIP_PRTR') {
    return AccessLevel.VIP_PRTR;
  }
  if (vipTier === 'VIP') {
    return AccessLevel.VIP;
  }

  return AccessLevel.NORMAL_USER;
}

export function checkAccess(userId: string, requiredLevel: AccessLevel): boolean {
  return getAccessLevel(userId) >= requiredLevel;
}

export function getAccessLabel(level: AccessLevel): string {
  if (level === AccessLevel.OWNER) return 'OWNER';
  if (level === AccessLevel.VIP_PRTR) return 'VIP_PRTR';
  if (level === AccessLevel.VIP) return 'VIP';
  return 'NORMAL_USER';
}
