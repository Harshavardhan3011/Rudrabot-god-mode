// 🔱 RUDRA.0x Type System - Central Interface Definitions

/**
 * User Data Structure
 * Stores individual user information across servers
 */
export interface UserData {
  // Core Identity
  userId: string;
  username: string;
  tag: string;
  avatar: string;

  // Account Metrics
  accountCreatedAt: number;
  joinedServerAt: number;

  // Economy Module (7)
  balance: number;
  bank: number;
  totalEarned: number;
  totalSpent: number;
  dailyClaimedAt: number;
  weeklyClaimedAt: number;
  monthlyClaimedAt: number;

  // RolePlay & Levels
  xp: number;
  level: number;
  prestige: number;
  badges: string[];
  achievements: string[];

  // Trust & Security
  trustScore: number;
  isBlacklisted: boolean;
  blacklistReason?: string;
  isVIP: boolean;
  vipTier?: "VIP" | "VIP_PRTR";
  vipExpiresAt?: number;

  // Reputation
  reputation: number;
  warnings: Warning[];
  strikes: Strike[];
  modNotes: ModNote[];

  // Moderation
  isMuted: boolean;
  muteExpires?: number;
  isQuarantined: boolean;
  quarantineReason?: string;

  // Inventory (Module 7)
  inventory: {
    itemId: string;
    quantity: number;
    acquiredAt: number;
  }[];

  // Status
  isAFK: boolean;
  afkReason?: string;
  afkSince?: number;

  // Custom Data
  customRoles: string[];
  customBadges: string[];
  profileColor?: string;
  profileBio?: string;
  markedWith?: string; // Marriage/Family system

  // Creator Profile (Module: Creator)
  creatorProfile?: {
    youtubeId: string | null;
    youtubeSubscribers: number;
    youtubeViews: number;
    youtubeVideos: number;
    twitchUsername: string | null;
    twitchFollowers: number;
    twitterHandle: string | null;
    twitterFollowers: number;
    totalViewsAllPlatforms: number;
    lastSyncedAt: number;
    createdAt: number;
  };

  // Timestamps
  createdAt: number;
  updatedAt: number;
  lastActive: number;
}

/**
 * Guild Data Structure
 * Stores server-specific configurations
 */
export interface GuildData {
  // Core Info
  guildId: string;
  guildName: string;
  ownerId: string;
  icon?: string;

  // Module Settings
  modules: {
    antinuke: boolean;
    sentinelScan: boolean;
    moderation: boolean;
    tickets: boolean;
    economy: boolean;
    music: boolean;
    jtcVoice: boolean;
    welcome: boolean;
    logging: boolean;
  };

  // Channels (Configuration)
  channels: {
    announcements?: string;
    logs?: string;
    modLogs?: string;
    welcome?: string;
    goodbye?: string;
    tickets?: string;
    music?: string;
    security?: string;
  };

  // Roles (Important)
  roles: {
    admin?: string[];
    moderator?: string[];
    vip?: string;
    muted?: string;
    quarantine?: string;
  };

  // Antinuke Flags (44 Total)
  antinuke: {
    antiBan: boolean;
    antiKick: boolean;
    antiBotAdd: boolean;
    antiAltJoin: boolean;
    antiMassMention: boolean;
    antiSpam: boolean;
    antiLink: boolean;
    antiInvite: boolean;
    antiZalgo: boolean;
    antiCaps: boolean;
    // ... (extends to 44 flags)
    strictMode: boolean;
    panicLockdown: boolean;
  };

  // Whitelist & Trust
  whitelist: {
    userId: string;
    username?: string;
    bypasses?: string[];
    reason?: string;
    addedAt?: string;
  }[];

  // Anti-VC Feature Toggles (Disabled by Default)
  antiVcToggles?: {
    antiVcJoin: boolean;
    antiVcLeave: boolean;
  };

  // Moderation Settings
  moderation: {
    automodEnabled: boolean;
    profanityFilter: boolean;
    linkFilter: boolean;
    nsfwImageScan: boolean;
    zalgoFilter: boolean;
    spamThreshold: number;
    automuteTime: number;
  };

  // Welcome & Goodbye
  welcome: {
    enabled: boolean;
    channel?: string;
    message?: string;
    embedEnabled: boolean;
    dmEnabled: boolean;
    cardEnabled: boolean;
    backgroundColor?: string;
  };

  goodbye?: {
    enabled: boolean;
    channel?: string;
    message?: string;
  };

  expansion?: {
    enabled: boolean;
    membersJoinedTracking: number;
    totalMembersAtInit: number;
    growthRate: number;
    currentPhase: string;
    initiatedAt: number;
  };

  // Economy Settings (Module 7)
  economy: {
    enabled: boolean;
    dailyReward: number;
    weeklyReward: number;
    monthlyReward: number;
    taxRate: number;
    casinoEnabled: boolean;
  };

  // Music Settings (Module 6)
  music: {
    enabled: boolean;
    defaultVolume: number;
    djRoleRequired: boolean;
    defaultAutoplay: boolean;
  };

  // Invite Tracking
  inviteTracking: {
    enabled: boolean;
    fakeInviteAction: "kick" | "ignore" | "ban";
    fakeInviteDelay: number; // in days
    leaderboardChannel?: string;
  };

  // Custom Triggers & Auto-Responders
  triggers: {
    word: string;
    response: string;
    embedType: "text" | "embed" | "dm";
  }[];

  // Echo Module - Auto Replies
  echoTriggers?: {
    id: string;
    trigger: string;
    response: string;
    exactMatch: boolean;
    createdAt: number;
    createdBy: string;
  }[];

  // Echo Module - Reaction Rules
  reactionRules?: {
    id: string;
    trigger: string;
    emoji: string;
    createdAt: number;
    createdBy: string;
  }[];

  // Premium Features
  isPremium: boolean;
  premiumExpiresAt?: number;

  // Timestamps
  createdAt: number;
  updatedAt: number;
}

/**
 * Warning Structure
 */
export interface Warning {
  id: string;
  reason: string;
  issuedBy: string;
  issuedAt: number;
  expiresAt?: number;
}

/**
 * Strike Structure (for escalation systems)
 */
export interface Strike {
  id: string;
  reason: string;
  module: string; // e.g., "automod", "manual", "antinuke"
  timestamp: number;
}

/**
 * Mod Note Structure
 */
export interface ModNote {
  id: string;
  content: string;
  authorId: string;
  createdAt: number;
}

/**
 * Command Type Definition
 */
export interface Command {
  name: string;
  description: string;
  category: string;
  module?: string;
  ownerOnly?: boolean;
  vipOnly?: boolean;
  permissions?: string[];
  cooldown?: number; // in ms
  data?: any; // SlashCommandBuilder
  execute: (interaction: any) => Promise<void>;
}

/**
 * Event Type Definition
 */
export interface EventHandler {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => Promise<void> | void;
}

/**
 * Economy Transaction Record
 */
export interface Transaction {
  id: string;
  userId: string;
  type: "earn" | "spend" | "transfer" | "bet" | "reward";
  amount: number;
  description: string;
  timestamp: number;
  relatedUserId?: string; // for transfers
}

/**
 * Ticket Data Structure
 */
export interface TicketData {
  id: string;
  userId: string;
  category: string;
  channelId: string;
  status: "open" | "claimed" | "closed" | "archived";
  claimedBy?: string;
  createdAt: number;
  closedAt?: number;
  priority: "low" | "medium" | "high" | "critical";
  notes: string[];
}

/**
 * Bot Configuration Type
 */
export interface BotConfig {
  token: string;
  prefix: string;
  clientId: string;
  ashuId: string;
  zoroId: string;
  dbType: "SQLITE";
  dbPath: string;
  geminiKey: string;
  vcStatusInterval: number;
  environment: "development" | "production";
}
