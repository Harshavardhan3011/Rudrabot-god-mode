/**
 * Audit Logger - Centralized action logging for all owner/VIP commands
 * Tracks: action, executor, target, timestamp, guild
 */

import DatabaseHandler from './dbHandler';

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

export class AuditLogger {
  private static instance: AuditLogger;

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  private get db() {
    return ((global as any).db as DatabaseHandler).getDb();
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

    try {
      const stmt = this.db.prepare(`
        INSERT INTO audit_logs (
          id, action, executor_id, executor_tag, target_id, target_name,
          guild_id, guild_name, details, timestamp, success, error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        entry.id,
        entry.action,
        entry.executorId,
        entry.executorTag || null,
        entry.targetId || null,
        entry.targetName || null,
        entry.guildId,
        entry.guildName || null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.timestamp,
        entry.success ? 1 : 0,
        entry.error || null
      );
    } catch (e) {
      console.error('❌ AuditLogger: Failed to save log to SQLite:', e);
    }

    // Also log to console
    const status = params.success ? '✅' : '❌';
    console.log(
      `${status} [AUDIT] ${params.action} by ${params.executorTag || params.executorId} in ${params.guildName || params.guildId}`
    );

    return entry;
  }

  private mapRowToLog(row: any): AuditLog {
    return {
      id: row.id,
      action: row.action,
      executorId: row.executor_id,
      executorTag: row.executor_tag,
      targetId: row.target_id,
      targetName: row.target_name,
      guildId: row.guild_id,
      guildName: row.guild_name,
      details: row.details ? JSON.parse(row.details) : undefined,
      timestamp: row.timestamp,
      success: row.success === 1,
      error: row.error
    };
  }

  /**
   * Get logs for a specific user
   */
  getLogsForUser(userId: string, limit: number = 50): AuditLog[] {
    const stmt = this.db.prepare('SELECT * FROM audit_logs WHERE executor_id = ? ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(userId, limit);
    return rows.map(this.mapRowToLog).reverse();
  }

  /**
   * Get logs for a specific guild
   */
  getLogsForGuild(guildId: string, limit: number = 100): AuditLog[] {
    const stmt = this.db.prepare('SELECT * FROM audit_logs WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(guildId, limit);
    return rows.map(this.mapRowToLog).reverse();
  }

  /**
   * Get logs for a specific action
   */
  getLogsForAction(action: string, limit: number = 50): AuditLog[] {
    const stmt = this.db.prepare('SELECT * FROM audit_logs WHERE action = ? ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(action, limit);
    return rows.map(this.mapRowToLog).reverse();
  }

  /**
   * Get all recent logs
   */
  getRecentLogs(limit: number = 100): AuditLog[] {
    const stmt = this.db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(limit);
    return rows.map(this.mapRowToLog).reverse();
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
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const args: any[] = [];

    if (params.action) {
      query += ' AND action = ?';
      args.push(params.action);
    }
    if (params.executorId) {
      query += ' AND executor_id = ?';
      args.push(params.executorId);
    }
    if (params.guildId) {
      query += ' AND guild_id = ?';
      args.push(params.guildId);
    }
    if (params.targetId) {
      query += ' AND target_id = ?';
      args.push(params.targetId);
    }
    if (params.since) {
      query += ' AND timestamp >= ?';
      args.push(params.since);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    args.push(params.limit || 50);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...args);
    return rows.map(this.mapRowToLog).reverse();
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
    const stmt = this.db.prepare('DELETE FROM audit_logs WHERE timestamp < ?');
    const info = stmt.run(timestamp);
    return info.changes;
  }

  /**
   * Get total log count
   */
  getLogCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM audit_logs');
    const row = stmt.get() as { count: number };
    return row.count;
  }
}

export default AuditLogger.getInstance();
