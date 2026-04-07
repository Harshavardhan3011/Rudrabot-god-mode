// 🔱 RUDRA.0x Exclusive SQLite Database Handler
// Centralized, high-performance SQLite abstraction layer

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { UserData, GuildData } from "../types";

class DatabaseHandler {
  private sqliteDb: Database.Database;

  constructor(dbPath: string) {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.sqliteDb = new Database(dbPath);
    
    // Enable WAL mode for better concurrency performance
    this.sqliteDb.pragma('journal_mode = WAL');
    
    this.initializeSQLiteSchema();

    console.log(`📦 Database initialized at ${dbPath}`);
  }

  /**
   * Get the underlying better-sqlite3 database instance
   */
  getDb(): Database.Database {
    return this.sqliteDb;
  }

  /**
   * Initialize SQLite schema (creates tables if they don't exist)
   */
  private initializeSQLiteSchema() {
    // Users table
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Guilds table
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS guilds (
        guild_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Transactions table
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT,
        timestamp INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      )
    `);
    
    // Audit Logs table
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        executor_id TEXT NOT NULL,
        executor_tag TEXT,
        target_id TEXT,
        target_name TEXT,
        guild_id TEXT NOT NULL,
        guild_name TEXT,
        details TEXT,
        timestamp INTEGER NOT NULL,
        success INTEGER NOT NULL,
        error TEXT
      )
    `);

    // Indexes for audit logs
    this.sqliteDb.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_executor ON audit_logs(executor_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_guild ON audit_logs(guild_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    `);

    // VIP Users table
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS vip_users (
        user_id TEXT PRIMARY KEY,
        tier TEXT NOT NULL,
        granted_at INTEGER NOT NULL,
        expires_at INTEGER,
        granted_by TEXT NOT NULL
      )
    `);

    // Blacklist table
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS blacklisted_users (
        user_id TEXT PRIMARY KEY,
        user_name TEXT,
        reason TEXT NOT NULL,
        added_at INTEGER NOT NULL,
        added_by TEXT NOT NULL
      )
    `);

    // Anti-Raid table
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS anti_raid_configs (
        guild_id TEXT PRIMARY KEY,
        enabled INTEGER NOT NULL,
        enabled_at INTEGER NOT NULL,
        enabled_by TEXT NOT NULL,
        join_threshold INTEGER NOT NULL,
        time_window INTEGER NOT NULL,
        slowmode_seconds INTEGER NOT NULL,
        verification_level TEXT NOT NULL
      )
    `);

    // Nickname Locks table
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS nickname_locks (
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        locked_nickname TEXT NOT NULL,
        locked_at INTEGER NOT NULL,
        locked_by TEXT NOT NULL,
        reason TEXT NOT NULL,
        PRIMARY KEY (user_id, guild_id)
      )
    `);

    // Server Backups table
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS server_backups (
        id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        data TEXT NOT NULL
      )
    `);

    console.log("✅ SQLite schema initialized");
  }

  /**
   * Get user data
   */
  async getUser(userId: string): Promise<UserData | null> {
    try {
      const stmt = this.sqliteDb.prepare("SELECT data FROM users WHERE user_id = ?");
      const result = stmt.get(userId) as { data: string } | undefined;
      return result ? JSON.parse(result.data) : null;
    } catch (error) {
      console.error(`❌ Error reading user from SQLite:`, error);
      return null;
    }
  }

  /**
   * Set user data
   */
  async setUser(userId: string, userData: UserData): Promise<boolean> {
    try {
      const stmt = this.sqliteDb.prepare(`
        INSERT OR REPLACE INTO users (user_id, data, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(userId, JSON.stringify(userData), userData.createdAt, Date.now());
      return true;
    } catch (error) {
      console.error(`❌ Error saving user to SQLite:`, error);
      return false;
    }
  }

  /**
   * Get guild data
   */
  async getGuild(guildId: string): Promise<GuildData | null> {
    try {
      const stmt = this.sqliteDb.prepare("SELECT data FROM guilds WHERE guild_id = ?");
      const result = stmt.get(guildId) as { data: string } | undefined;
      return result ? JSON.parse(result.data) : null;
    } catch (error) {
      console.error(`❌ Error reading guild from SQLite:`, error);
      return null;
    }
  }

  /**
   * Set guild data
   */
  async setGuild(guildId: string, guildData: GuildData): Promise<boolean> {
    try {
      const stmt = this.sqliteDb.prepare(`
        INSERT OR REPLACE INTO guilds (guild_id, data, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(guildId, JSON.stringify(guildData), guildData.createdAt, Date.now());
      return true;
    } catch (error) {
      console.error(`❌ Error saving guild to SQLite:`, error);
      return false;
    }
  }

  /**
   * Delete user data
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      const stmt = this.sqliteDb.prepare("DELETE FROM users WHERE user_id = ?");
      stmt.run(userId);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting user from SQLite:`, error);
      return false;
    }
  }

  /**
   * Delete guild data
   */
  async deleteGuild(guildId: string): Promise<boolean> {
    try {
      const stmt = this.sqliteDb.prepare("DELETE FROM guilds WHERE guild_id = ?");
      stmt.run(guildId);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting guild from SQLite:`, error);
      return false;
    }
  }

  /**
   * Get all users (useful for admin operations)
   */
  async getAllUsers(): Promise<UserData[]> {
    try {
      const stmt = this.sqliteDb.prepare("SELECT data FROM users");
      const results = stmt.all() as { data: string }[];
      return results.map((r) => JSON.parse(r.data));
    } catch (error) {
      console.error(`❌ Error reading all users from SQLite:`, error);
      return [];
    }
  }

  /**
   * Get all guilds
   */
  async getAllGuilds(): Promise<GuildData[]> {
    try {
      const stmt = this.sqliteDb.prepare("SELECT data FROM guilds");
      const results = stmt.all() as { data: string }[];
      return results.map((r) => JSON.parse(r.data));
    } catch (error) {
      console.error(`❌ Error reading all guilds from SQLite:`, error);
      return [];
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.sqliteDb) {
      // Create a checkpoint before closing
      this.sqliteDb.pragma('wal_checkpoint(RESTART)');
      this.sqliteDb.close();
      console.log("✅ SQLite connection closed");
    }
  }
}

export default DatabaseHandler;
