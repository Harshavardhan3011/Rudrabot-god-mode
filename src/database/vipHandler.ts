/**
 * VIP Handler - Manages VIP tier system with duration parsing and auto-expiry
 * Handles: grants, revokes, expirations, and tier verification
 */

import DatabaseHandler from './dbHandler';

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

export class VIPHandler {
  private static instance: VIPHandler;
  private expiryCheckInterval: NodeJS.Timeout | null = null;
  private fallbackDbHandler?: DatabaseHandler;

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
    this.startExpiryCheck();
  }

  static getInstance(): VIPHandler {
    if (!VIPHandler.instance) {
      VIPHandler.instance = new VIPHandler();
    }
    return VIPHandler.instance;
  }

  private get db() {
    const globalDb = (global as any).db as DatabaseHandler | undefined;
    if (globalDb) {
      return globalDb.getDb();
    }

    if (!this.fallbackDbHandler) {
      const dbPath = process.env.DATABASE_PATH || './src/database/rudra_main.sqlite';
      this.fallbackDbHandler = new DatabaseHandler(dbPath);
    }

    return this.fallbackDbHandler.getDb();
  }

  private mapRowToVIP(row: any): VIPRecord {
    return {
      userId: row.user_id,
      tier: row.tier as VIPTier,
      grantedAt: row.granted_at,
      expiresAt: row.expires_at,
      grantedBy: row.granted_by,
    };
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
    const parsedDuration = this.parseDuration(duration);
    const expiresAt = parsedDuration === null ? null : Date.now() + parsedDuration;
    const grantedAt = Date.now();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO vip_users (user_id, tier, granted_at, expires_at, granted_by)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(userId, tier, grantedAt, expiresAt, grantedBy);

    return {
      userId,
      tier,
      grantedAt,
      expiresAt,
      grantedBy,
    };
  }

  /**
   * Revoke VIP status from a user
   */
  revoke(userId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM vip_users WHERE user_id = ?');
    const info = stmt.run(userId);
    return info.changes > 0;
  }

  /**
   * Check if user is currently VIP
   */
  isVIP(userId: string): boolean {
    return this.getVIP(userId) !== null;
  }

  /**
   * Get VIP record for a user
   */
  getVIP(userId: string): VIPRecord | null {
    const stmt = this.db.prepare('SELECT * FROM vip_users WHERE user_id = ?');
    const row = stmt.get(userId);
    
    if (!row) return null;

    const vip = this.mapRowToVIP(row);

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
    const stmt = this.db.prepare('SELECT * FROM vip_users');
    const rows = stmt.all();
    
    const vips = rows.map((row: any) => this.mapRowToVIP(row));
    const activeVips = [];

    for (const vip of vips) {
      if (vip.expiresAt === null || vip.expiresAt > Date.now()) {
        activeVips.push(vip);
      } else {
        // Auto-revoke expired ones found during full scan
        this.revoke(vip.userId);
      }
    }

    return activeVips;
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
      try {
        const stmt = this.db.prepare('DELETE FROM vip_users WHERE expires_at IS NOT NULL AND expires_at < ?');
        const info = stmt.run(Date.now());

        if (info.changes > 0) {
          console.log(`🔄 VIPHandler: Expired ${info.changes} VIP record(s) automatically`);
        }
      } catch (err) {
        console.error('Error in VIP Expiry Check loop:', err);
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
