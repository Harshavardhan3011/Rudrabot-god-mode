// 🔱 RUDRA.0x Helper Functions
// Utility functions used across the bot

import { UserData } from "../types";
import DatabaseHandler from "../database/dbHandler";

/**
 * Create default user data template
 */
function createDefaultUserData(userId: string, username: string): UserData {
  return {
    userId,
    username,
    tag: username,
    avatar: "",
    accountCreatedAt: Date.now(),
    joinedServerAt: Date.now(),
    balance: 0,
    bank: 0,
    totalEarned: 0,
    totalSpent: 0,
    dailyClaimedAt: 0,
    weeklyClaimedAt: 0,
    monthlyClaimedAt: 0,
    xp: 0,
    level: 1,
    prestige: 0,
    badges: [],
    achievements: [],
    trustScore: 100,
    isBlacklisted: false,
    isVIP: false,
    reputation: 0,
    warnings: [],
    strikes: [],
    modNotes: [],
    isMuted: false,
    isQuarantined: false,
    inventory: [],
    isAFK: false,
    customRoles: [],
    customBadges: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastActive: Date.now(),
  };
}

/**
 * Get or create user data from database
 */
export async function getOrCreateUserData(userId: string, username: string = "Unknown"): Promise<UserData | null> {
  try {
    const db = (global as any).db as DatabaseHandler | undefined;
    if (!db) {
      console.error("❌ Global database not initialized");
      return null;
    }

    let userData = await db.getUser(userId);
    if (!userData) {
      userData = createDefaultUserData(userId, username);
      const saved = await db.setUser(userId, userData);
      if (!saved) {
        console.error(`❌ Failed to create user data for ${userId}`);
        return null;
      }
    }
    return userData;
  } catch (error) {
    console.error(`❌ Error in getOrCreateUserData:`, error);
    return null;
  }
}

/**
 * Save user data to database
 */
export async function saveUserData(userId: string, userData: UserData): Promise<boolean> {
  try {
    const db = (global as any).db as DatabaseHandler | undefined;
    if (!db) {
      console.error("❌ Global database not initialized");
      return false;
    }

    userData.updatedAt = Date.now();
    return await db.setUser(userId, userData);
  } catch (error) {
    console.error(`❌ Error in saveUserData:`, error);
    return false;
  }
}

/**
 * Delay execution for a specific time
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format currency (coins)
 */
export function formatCoins(coins: number): string {
  if (coins >= 1000000) {
    return `${(coins / 1000000).toFixed(1)}M`;
  } else if (coins >= 1000) {
    return `${(coins / 1000).toFixed(1)}K`;
  }
  return coins.toString();
}

/**
 * Format time duration to readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(" ") || "0s";
}

/**
 * Get random item from array
 */
export function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle array (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get random integer between min and max
 */
export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Chance based function
 */
export function rollChance(percentage: number): boolean {
  return Math.random() * 100 < percentage;
}

/**
 * Clamp number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * Get emoji for number/rank
 */
export function getNumberEmoji(num: number): string {
  const emojiMap: { [key: number]: string } = {
    1: "🥇",
    2: "🥈",
    3: "🥉",
    4: "4️⃣",
    5: "5️⃣",
    6: "6️⃣",
    7: "7️⃣",
    8: "8️⃣",
    9: "9️⃣",
    10: "🔟",
  };
  return emojiMap[num] || `${num}️⃣`;
}

/**
 * Progress bar generator
 */
export function generateProgressBar(
  current: number,
  max: number,
  length: number = 20
): string {
  const percentage = current / max;
  const filledLength = Math.round(length * percentage);
  const fill = "█".repeat(filledLength);
  const empty = "░".repeat(length - filledLength);
  return `${fill}${empty} ${Math.round(percentage * 100)}%`;
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Remove duplicates from array
 */
export function removeDuplicates<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Deep copy object
 */
export function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sleep function (same as delay but more intuitive name)
 */
export async function sleep(ms: number): Promise<void> {
  return delay(ms);
}

/**
 * Convert array to comma-separated string with "and"
 */
export function arrayToString(
  array: string[],
  separator = ", ",
  lastSeparator = "and"
): string {
  if (array.length === 0) return "";
  if (array.length === 1) return array[0];
  if (array.length === 2) return `${array[0]} ${lastSeparator} ${array[1]}`;

  return `${array.slice(0, -1).join(separator)} ${lastSeparator} ${array[array.length - 1]}`;
}

/**
 * Check if value is empty
 */
export function isEmpty(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && Object.keys(value).length === 0)
  );
}

/**
 * Get user avatar URL
 */
export function getUserAvatarUrl(userId: string, avatarHash?: string): string {
  if (avatarHash) {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=256`;
  }
  return `https://cdn.discordapp.com/embed/avatars/0.png`;
}

/**
 * Generate random color (hex)
 */
export function getRandomColor(): string {
  const colors = [
    "#FF0000", // Red
    "#00FF00", // Green
    "#0000FF", // Blue
    "#FFFF00", // Yellow
    "#00FFFF", // Cyan
    "#FF00FF", // Magenta
    "#FFA500", // Orange
    "#800080", // Purple
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export default {
  delay,
  formatCoins,
  formatDuration,
  getRandomItem,
  shuffleArray,
  getRandomInt,
  rollChance,
  clamp,
  formatDate,
  getNumberEmoji,
  generateProgressBar,
  chunkArray,
  removeDuplicates,
  deepCopy,
  sleep,
  arrayToString,
  isEmpty,
  getUserAvatarUrl,
  getRandomColor,
};
