/**
 * Permission Validator - Centralized authorization system for owner/VIP commands
 * Checks: Owner ID, VIPPRTR role, logging
 */

import { ChatInputCommandInteraction } from 'discord.js';
import vipHandler from '../database/vipHandler';
import { AccessLevel, checkAccess, getAccessLabel, getAccessLevel } from './accessControl';

export class PermissionValidator {
  private static instance: PermissionValidator;
  private readonly fallbackOwnerIds = new Set<string>([
    '1344818916266086531',
    '970124037621678100',
  ]);

  private constructor() {}

  static getInstance(): PermissionValidator {
    if (!PermissionValidator.instance) {
      PermissionValidator.instance = new PermissionValidator();
    }
    return PermissionValidator.instance;
  }

  /**
   * Check if user is owner (ASHU_ID)
   */
  isOwner(userId: string): boolean {
    const envOwners = new Set<string>(
      [
        ...(process.env.BOT_OWNERS || '').split(',').map((id) => id.trim()).filter(Boolean),
        process.env.BOT_OWNER_ID || '',
        process.env.ASHU_ID || '',
        process.env.ZORO_ID || '',
      ].filter(Boolean)
    );

    return envOwners.has(userId) || this.fallbackOwnerIds.has(userId);
  }

  /**
   * Check if user is VIP (VIPPRTR role)
   */
  isVIP(userId: string): boolean {
    return vipHandler.isVIP(userId);
  }

  checkAccess(userId: string, requiredLevel: AccessLevel): boolean {
    return checkAccess(userId, requiredLevel);
  }

  /**
   * Check if user is authorized (Owner OR VIP)
   */
  isAuthorized(userId: string): boolean {
    return this.checkAccess(userId, AccessLevel.VIP);
  }

  /**
   * Validate interaction authorization & return denial embed if unauthorized
   * Returns true if authorized, false if not
   */
  validateInteraction(interaction: ChatInputCommandInteraction): boolean {
    const userId = interaction.user.id;
    return this.isAuthorized(userId);
  }

  /**
   * Get authorization level
   */
  getAuthLevel(userId: string): 'owner' | 'vip_prtr' | 'vip' | 'none' {
    const level = getAccessLevel(userId);
    if (level === AccessLevel.OWNER) return 'owner';
    if (level === AccessLevel.VIP_PRTR) return 'vip_prtr';
    if (level === AccessLevel.VIP) return 'vip';
    return 'none';
  }

  /**
   * Get authorization info for display
   */
  getAuthInfo(userId: string): { level: string; expiresAt?: number; remaining?: string } {
    const level = getAccessLevel(userId);
    if (level === AccessLevel.OWNER) {
      return { level: 'OWNER' };
    }

    const vip = vipHandler.getVIP(userId);
    if (vip) {
      const remaining = vipHandler.getRemainingTime(userId);
      return {
        level: getAccessLabel(level),
        expiresAt: vip.expiresAt ?? undefined,
        remaining: remaining === null ? 'Lifetime' : vipHandler.formatRemainingTime(remaining),
      };
    }

    return { level: '❌ None' };
  }
}

export default PermissionValidator.getInstance();
