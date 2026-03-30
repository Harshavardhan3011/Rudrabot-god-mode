/**
 * VIP Handler - Manages VIP tier system with duration parsing and auto-expiry
 * Handles: grants, revokes, expirations, and tier verification
 */

import fs from 'fs';
import path from 'path';

export type VIPTier = 'VIP' | 'VIP_PRTR';
export type VIPDurationChoice =
  | '1hr'
  | '12hr'
  | '24hr'
  | '3days'
  | '7days'
  | '14days'
  | '30days'
  | '6months'
  | '1yr'
  | 'Lifetime';

interface VIPRecord {
  userId: string;
  tier: VIPTier;
  grantedAt: number;
  expiresAt: number | null;
  grantedBy: string; // Who granted this VIP status
}

interface VIPDatabase {
  vips: VIPRecord[];
  lastUpdated: number;
}

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'vip.json');

export class VIPHandler {
  private static instance: VIPHandler;
  private db: VIPDatabase = { vips: [], lastUpdated: 0 };
  private expiryCheckInterval: NodeJS.Timeout | null = null;

  private static readonly DURATION_MAP: Record<Exclude<VIPDurationChoice, 'Lifetime'>, number> = {
    '1hr': 60 * 60 * 1000,
    '12hr': 12 * 60 * 60 * 1000,
    '24hr': 24 * 60 * 60 * 1000,
    '3days': 3 * 24 * 60 * 60 * 1000,
    '7days': 7 * 24 * 60 * 60 * 1000,
    '14days': 14 * 24 * 60 * 60 * 1000,
    '30days': 30 * 24 * 60 * 60 * 1000,
    '6months': 6 * 30 * 24 * 60 * 60 * 1000,
    '1yr': 365 * 24 * 60 * 60 * 1000,
  };

  private constructor() {
    this.loadDatabase();
    this.startExpiryCheck();
  }

  static getInstance(): VIPHandler {
    if (!VIPHandler.instance) {
      VIPHandler.instance = new VIPHandler();
    }
    return VIPHandler.instance;
  }

  /**
   * Load VIP database from JSON file
   */
  private loadDatabase(): void {
    try {
      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        this.db = JSON.parse(data);
        this.migrateLegacyRecords();
      } else {
        this.ensureDataDir();
        this.saveDatabase();
      }
    } catch (error) {
      console.error('❌ VIPHandler: Failed to load database:', error);
      this.db = { vips: [], lastUpdated: Date.now() };
    }
  }

  private migrateLegacyRecords(): void {
    this.db.vips = this.db.vips.map((record) => {
      const normalizedTier: VIPTier =
        (record as any).tier === 'VIP_PRTR' || (record as any).tier === 'VIPPRTR'
          ? 'VIP_PRTR'
          : 'VIP';

      const rawExpiresAt = (record as any).expiresAt;
      const expiresAt = rawExpiresAt === null || rawExpiresAt === undefined ? null : Number(rawExpiresAt);

      return {
        userId: String((record as any).userId),
        tier: normalizedTier,
        grantedAt: Number((record as any).grantedAt || Date.now()),
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
        grantedBy: String((record as any).grantedBy || 'system-migration'),
      };
    });
  }

  /**
   * Save VIP database to JSON file
   */
  private saveDatabase(): void {
    try {
      this.ensureDataDir();
      this.db.lastUpdated = Date.now();
      fs.writeFileSync(DB_PATH, JSON.stringify(this.db, null, 2));
    } catch (error) {
      console.error('❌ VIPHandler: Failed to save database:', error);
    }
  }

  /**
   * Ensure data directory exists
   */
  private ensureDataDir(): void {
    const dataDir = path.join(process.cwd(), 'src', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Parse duration string to milliseconds
   * Supports: 1d, 7d, 24h, 1h, 30m, etc.
   */
  parseDuration(duration: VIPDurationChoice): number | null {
    if (duration === 'Lifetime') {
      return null;
    }

    const mapped = VIPHandler.DURATION_MAP[duration as Exclude<VIPDurationChoice, 'Lifetime'>];
    if (!mapped) {
      throw new Error(`Invalid duration choice: ${duration}`);
    }

    return mapped;
  }

  /**
   * Grant VIP status to a user
   */
  grant(userId: string, duration: VIPDurationChoice, grantedBy: string, tier: VIPTier): VIPRecord {
    // Remove existing if present
    this.db.vips = this.db.vips.filter(v => v.userId !== userId);

    const parsedDuration = this.parseDuration(duration);
    const expiresAt = parsedDuration === null ? null : Date.now() + parsedDuration;

    const record: VIPRecord = {
      userId,
      tier,
      grantedAt: Date.now(),
      expiresAt,
      grantedBy,
    };

    this.db.vips.push(record);
    this.saveDatabase();

    return record;
  }

  /**
   * Revoke VIP status from a user
   */
  revoke(userId: string): boolean {
    const initial_length = this.db.vips.length;
    this.db.vips = this.db.vips.filter(v => v.userId !== userId);

    if (this.db.vips.length < initial_length) {
      this.saveDatabase();
      return true;
    }

    return false;
  }

  /**
   * Check if user is currently VIP
   */
  isVIP(userId: string): boolean {
    const vip = this.db.vips.find(v => v.userId === userId);
    if (!vip) return false;

    if (vip.expiresAt === null) {
      return true;
    }

    // Check if expired
    if (vip.expiresAt < Date.now()) {
      this.revoke(userId);
      return false;
    }

    return true;
  }

  /**
   * Get VIP record for a user
   */
  getVIP(userId: string): VIPRecord | null {
    const vip = this.db.vips.find(v => v.userId === userId);
    if (!vip) return null;

    if (vip.expiresAt === null) {
      return vip;
    }

    // Check if expired
    if (vip.expiresAt < Date.now()) {
      this.revoke(userId);
      return null;
    }

    return vip;
  }

  /**
   * Get all active VIPs
   */
  getAllVIPs(): VIPRecord[] {
    // Filter out expired
    this.db.vips = this.db.vips.filter(v => {
      if (v.expiresAt === null) {
        return true;
      }
      if (v.expiresAt < Date.now()) {
        return false;
      }
      return true;
    });

    this.saveDatabase();
    return this.db.vips;
  }

  /**
   * Get remaining time for a VIP user (in milliseconds)
   */
  getRemainingTime(userId: string): number | null {
    const vip = this.getVIP(userId);
    if (!vip) return null;

    if (vip.expiresAt === null) {
      return null;
    }

    const remaining = vip.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  getTier(userId: string): VIPTier | null {
    const vip = this.getVIP(userId);
    return vip ? vip.tier : null;
  }

  /**
   * Format remaining time as human-readable string
   */
  formatRemainingTime(ms: number): string {
    if (ms <= 0) return 'Expired';

    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  /**
   * Start automatic expiry check (every 5 minutes)
   */
  private startExpiryCheck(): void {
    this.expiryCheckInterval = setInterval(() => {
      const initialCount = this.db.vips.length;
      this.db.vips = this.db.vips.filter(v => v.expiresAt === null || v.expiresAt > Date.now());

      if (this.db.vips.length < initialCount) {
        this.saveDatabase();
        console.log(`🔄 VIPHandler: Expired ${initialCount - this.db.vips.length} VIP record(s)`);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Stop expiry check
   */
  stopExpiryCheck(): void {
    if (this.expiryCheckInterval) {
      clearInterval(this.expiryCheckInterval);
      this.expiryCheckInterval = null;
    }
  }
}

export default VIPHandler.getInstance();
