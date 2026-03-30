/**
 * Audit Logger - Centralized action logging for all owner/VIP commands
 * Tracks: action, executor, target, timestamp, guild
 */

import fs from 'fs';
import path from 'path';

export interface AuditLog {
  id: string;
  action: string; // Command name (e.g., 'vip-grant', 'server-lockdown')
  executorId: string; // User who ran command
  executorTag?: string; // User tag for readability
  targetId?: string; // Target user/channel/role
  targetName?: string; // Target name for readability
  guildId: string;
  guildName?: string;
  details?: Record<string, any>; // Extra data (duration, reason, etc.)
  timestamp: number;
  success: boolean;
  error?: string;
}

interface AuditDatabase {
  logs: AuditLog[];
}

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'audit-logs.json');
const MAX_LOGS = 10000; // Keep last 10k logs

export class AuditLogger {
  private static instance: AuditLogger;
  private db: AuditDatabase = { logs: [] };

  private constructor() {
    this.loadDatabase();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Load audit logs from JSON file
   */
  private loadDatabase(): void {
    try {
      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        this.db = JSON.parse(data);
      } else {
        this.ensureDataDir();
        this.saveDatabase();
      }
    } catch (error) {
      console.error('❌ AuditLogger: Failed to load database:', error);
      this.db = { logs: [] };
    }
  }

  /**
   * Save audit logs to JSON file
   */
  private saveDatabase(): void {
    try {
      this.ensureDataDir();
      // Keep only last MAX_LOGS entries
      if (this.db.logs.length > MAX_LOGS) {
        this.db.logs = this.db.logs.slice(-MAX_LOGS);
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(this.db, null, 2));
    } catch (error) {
      console.error('❌ AuditLogger: Failed to save database:', error);
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
   * Generate unique log ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log an action
   */
  log(params: {
    action: string;
    executorId: string;
    executorTag?: string;
    targetId?: string;
    targetName?: string;
    guildId: string;
    guildName?: string;
    details?: Record<string, any>;
    success: boolean;
    error?: string;
  }): AuditLog {
    const entry: AuditLog = {
      id: this.generateId(),
      action: params.action,
      executorId: params.executorId,
      executorTag: params.executorTag,
      targetId: params.targetId,
      targetName: params.targetName,
      guildId: params.guildId,
      guildName: params.guildName,
      details: params.details,
      timestamp: Date.now(),
      success: params.success,
      error: params.error,
    };

    this.db.logs.push(entry);
    this.saveDatabase();

    // Also log to console
    const status = params.success ? '✅' : '❌';
    console.log(
      `${status} [AUDIT] ${params.action} by ${params.executorTag || params.executorId} in ${params.guildName || params.guildId}`
    );

    return entry;
  }

  /**
   * Get logs for a specific user
   */
  getLogsForUser(userId: string, limit: number = 50): AuditLog[] {
    return this.db.logs.filter(log => log.executorId === userId).slice(-limit);
  }

  /**
   * Get logs for a specific guild
   */
  getLogsForGuild(guildId: string, limit: number = 100): AuditLog[] {
    return this.db.logs.filter(log => log.guildId === guildId).slice(-limit);
  }

  /**
   * Get logs for a specific action
   */
  getLogsForAction(action: string, limit: number = 50): AuditLog[] {
    return this.db.logs.filter(log => log.action === action).slice(-limit);
  }

  /**
   * Get all recent logs
   */
  getRecentLogs(limit: number = 100): AuditLog[] {
    return this.db.logs.slice(-limit);
  }

  /**
   * Search logs by action and executor
   */
  search(params: {
    action?: string;
    executorId?: string;
    guildId?: string;
    targetId?: string;
    since?: number; // Timestamp
    limit?: number;
  }): AuditLog[] {
    let results = [...this.db.logs];

    if (params.action) {
      results = results.filter(log => log.action === params.action);
    }

    if (params.executorId) {
      results = results.filter(log => log.executorId === params.executorId);
    }

    if (params.guildId) {
      results = results.filter(log => log.guildId === params.guildId);
    }

    if (params.targetId) {
      results = results.filter(log => log.targetId === params.targetId);
    }

    if (params.since) {
      results = results.filter(log => log.timestamp >= params.since!);
    }

    const limit = params.limit || 50;
    return results.slice(-limit);
  }

  /**
   * Format log for display
   */
  formatLog(log: AuditLog): string {
    const date = new Date(log.timestamp).toLocaleString();
    const status = log.success ? '✅' : '❌';
    return `${status} **${log.action}** by \`${log.executorTag || log.executorId}\` → \`${log.targetName || log.targetId || 'N/A'}\` [${date}]`;
  }

  /**
   * Purge old logs (older than specified timestamp)
   */
  purgeOlderThan(timestamp: number): number {
    const initial = this.db.logs.length;
    this.db.logs = this.db.logs.filter(log => log.timestamp > timestamp);
    this.saveDatabase();
    return initial - this.db.logs.length;
  }

  /**
   * Get total log count
   */
  getLogCount(): number {
    return this.db.logs.length;
  }
}

export default AuditLogger.getInstance();
