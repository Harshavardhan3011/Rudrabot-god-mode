// 🔱 RUDRA.0x Hybrid Database Handler
// Supports both GitHub JSON and SQLite - completely abstracted layer

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { UserData, GuildData } from "../types";

class DatabaseHandler {
  private dbType: "GITHUB_JSON" | "SQLITE";
  private jsonDbPath: string;
  private sqliteDb?: Database.Database;

  constructor(dbType: "GITHUB_JSON" | "SQLITE", dbPath: string) {
    this.dbType = dbType;
    this.jsonDbPath = path.join(process.cwd(), "src/database/local");

    if (!fs.existsSync(this.jsonDbPath)) {
      fs.mkdirSync(this.jsonDbPath, { recursive: true });
    }

    if (dbType === "SQLITE") {
      this.sqliteDb = new Database(dbPath);
      this.initializeSQLiteSchema();
    } else {
      this.ensureJsonFiles();
    }

    console.log(`📦 Database initialized: ${dbType}`);
  }

  /**
   * Initialize SQLite schema (creates tables if they don't exist)
   */
  private initializeSQLiteSchema() {
    if (!this.sqliteDb) return;

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

    console.log("✅ SQLite schema initialized");
  }

  /**
   * Ensure JSON files exist
   */
  private ensureJsonFiles() {
    const userFile = path.join(this.jsonDbPath, "users.json");
    const guildFile = path.join(this.jsonDbPath, "guilds.json");

    if (!fs.existsSync(userFile)) {
      fs.writeFileSync(userFile, JSON.stringify({}, null, 2));
    }
    if (!fs.existsSync(guildFile)) {
      fs.writeFileSync(guildFile, JSON.stringify({}, null, 2));
    }
  }

  /**
   * Get user data - abstracted for both JSON and SQLite
   */
  async getUser(userId: string): Promise<UserData | null> {
    if (this.dbType === "GITHUB_JSON") {
      return this.getUserFromJson(userId);
    } else {
      return this.getUserFromSQLite(userId);
    }
  }

  /**
   * Get user from JSON
   */
  private getUserFromJson(userId: string): UserData | null {
    try {
      const filePath = path.join(this.jsonDbPath, "users.json");
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return data[userId] || null;
    } catch (error) {
      console.error(`❌ Error reading user from JSON:`, error);
      return null;
    }
  }

  /**
   * Get user from SQLite
   */
  private getUserFromSQLite(userId: string): UserData | null {
    if (!this.sqliteDb) return null;
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
   * Set user data - abstracted for both sources
   */
  async setUser(userId: string, userData: UserData): Promise<boolean> {
    if (this.dbType === "GITHUB_JSON") {
      return this.setUserJson(userId, userData);
    } else {
      return this.setUserSQLite(userId, userData);
    }
  }

  /**
   * Set user in JSON
   */
  private setUserJson(userId: string, userData: UserData): boolean {
    try {
      const filePath = path.join(this.jsonDbPath, "users.json");
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      data[userId] = userData;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`❌ Error saving user to JSON:`, error);
      return false;
    }
  }

  /**
   * Set user in SQLite
   */
  private setUserSQLite(userId: string, userData: UserData): boolean {
    if (!this.sqliteDb) return false;
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
    if (this.dbType === "GITHUB_JSON") {
      return this.getGuildFromJson(guildId);
    } else {
      return this.getGuildFromSQLite(guildId);
    }
  }

  /**
   * Get guild from JSON
   */
  private getGuildFromJson(guildId: string): GuildData | null {
    try {
      const filePath = path.join(this.jsonDbPath, "guilds.json");
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return data[guildId] || null;
    } catch (error) {
      console.error(`❌ Error reading guild from JSON:`, error);
      return null;
    }
  }

  /**
   * Get guild from SQLite
   */
  private getGuildFromSQLite(guildId: string): GuildData | null {
    if (!this.sqliteDb) return null;
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
    if (this.dbType === "GITHUB_JSON") {
      return this.setGuildJson(guildId, guildData);
    } else {
      return this.setGuildSQLite(guildId, guildData);
    }
  }

  /**
   * Set guild in JSON
   */
  private setGuildJson(guildId: string, guildData: GuildData): boolean {
    try {
      const filePath = path.join(this.jsonDbPath, "guilds.json");
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      data[guildId] = guildData;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`❌ Error saving guild to JSON:`, error);
      return false;
    }
  }

  /**
   * Set guild in SQLite
   */
  private setGuildSQLite(guildId: string, guildData: GuildData): boolean {
    if (!this.sqliteDb) return false;
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
    if (this.dbType === "GITHUB_JSON") {
      try {
        const filePath = path.join(this.jsonDbPath, "users.json");
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        delete data[userId];
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
      } catch (error) {
        console.error(`❌ Error deleting user from JSON:`, error);
        return false;
      }
    } else if (this.sqliteDb) {
      try {
        const stmt = this.sqliteDb.prepare("DELETE FROM users WHERE user_id = ?");
        stmt.run(userId);
        return true;
      } catch (error) {
        console.error(`❌ Error deleting user from SQLite:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Delete guild data
   */
  async deleteGuild(guildId: string): Promise<boolean> {
    if (this.dbType === "GITHUB_JSON") {
      try {
        const filePath = path.join(this.jsonDbPath, "guilds.json");
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        delete data[guildId];
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
      } catch (error) {
        console.error(`❌ Error deleting guild from JSON:`, error);
        return false;
      }
    } else if (this.sqliteDb) {
      try {
        const stmt = this.sqliteDb.prepare("DELETE FROM guilds WHERE guild_id = ?");
        stmt.run(guildId);
        return true;
      } catch (error) {
        console.error(`❌ Error deleting guild from SQLite:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Get all users (useful for admin operations)
   */
  async getAllUsers(): Promise<UserData[]> {
    if (this.dbType === "GITHUB_JSON") {
      try {
        const filePath = path.join(this.jsonDbPath, "users.json");
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        return Object.values(data) as UserData[];
      } catch (error) {
        console.error(`❌ Error reading all users from JSON:`, error);
        return [];
      }
    } else if (this.sqliteDb) {
      try {
        const stmt = this.sqliteDb.prepare("SELECT data FROM users");
        const results = stmt.all() as { data: string }[];
        return results.map((r) => JSON.parse(r.data));
      } catch (error) {
        console.error(`❌ Error reading all users from SQLite:`, error);
        return [];
      }
    }
    return [];
  }

  /**
   * Get all guilds
   */
  async getAllGuilds(): Promise<GuildData[]> {
    if (this.dbType === "GITHUB_JSON") {
      try {
        const filePath = path.join(this.jsonDbPath, "guilds.json");
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        return Object.values(data) as GuildData[];
      } catch (error) {
        console.error(`❌ Error reading all guilds from JSON:`, error);
        return [];
      }
    } else if (this.sqliteDb) {
      try {
        const stmt = this.sqliteDb.prepare("SELECT data FROM guilds");
        const results = stmt.all() as { data: string }[];
        return results.map((r) => JSON.parse(r.data));
      } catch (error) {
        console.error(`❌ Error reading all guilds from SQLite:`, error);
        return [];
      }
    }
    return [];
  }

  /**
   * Close database connection (for SQLite)
   */
  close() {
    if (this.sqliteDb) {
      this.sqliteDb.close();
      console.log("✅ SQLite connection closed");
    }
  }
}

export default DatabaseHandler;
