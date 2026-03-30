import vipHandler from '../database/vipHandler';

export enum AccessLevel {
  NORMAL_USER = 0,
  VIP = 1,
  VIP_PRTR = 2,
  OWNER = 3,
}

export function getAccessLevel(userId: string): AccessLevel {
  if (userId === process.env.ASHU_ID) {
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
