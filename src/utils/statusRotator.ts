// 🔱 RUDRA.0x Dynamic VC Status Engine
// Rotates bot status every 10 mins based on Ashu/Zoro presence or conditions

import { Client, ActivityType } from "discord.js";

interface StatusOption {
  text: string;
  type: ActivityType;
  emoji?: string;
}

class StatusRotator {
  private client: Client;
  private statusIndex: number = 0;
  private ashuId: string;
  private zoroId: string;
  private interval: NodeJS.Timeout | null = null;

  // 18 Rotating Status Messages (Production Ready)
  private statuses: StatusOption[] = [
    {
      text: "Ruling the Discord Matrix, One Command at a Time.",
      type: ActivityType.Playing,
    },
    {
      text: "Over 1,300 God-Mode Commands",
      type: ActivityType.Playing,
    },
    {
      text: `PREFIX: [/] | PLAY MUSIC & ENJOY!`,
      type: ActivityType.Watching,
    },
    {
      text: "ASK ME ANYTHING | AI CHAT ACTIVE",
      type: ActivityType.Listening,
    },
    {
      text: "NEED HELP? OPEN A SUPPORT TICKET",
      type: ActivityType.Watching,
    },
    {
      text: "1,300+ COMMANDS AT YOUR SERVICE",
      type: ActivityType.Playing,
    },
    {
      text: "HIGH-FIDELITY 8D AUDIO STREAMING",
      type: ActivityType.Playing,
    },
    {
      text: "BASS-BOOSTED VIBES ONLY",
      type: ActivityType.Listening,
    },
    {
      text: "NIGHTCORE MODE: FAST & LOUD",
      type: ActivityType.Playing,
    },
    {
      text: "LO-FI RADIO: 24/7 CHILL STATION",
      type: ActivityType.Listening,
    },
    {
      text: "WORMHOLE SYNC: ANNA•CHELLI•AKKA",
      type: ActivityType.Watching,
    },
    {
      text: "LATENCY: 0.004ms | HYPER-FAST",
      type: ActivityType.Watching,
    },
    {
      text: "TRACKING SERVER GROWTH... [100%]",
      type: ActivityType.Watching,
    },
    {
      text: "POWERED BY ASHU 👑 | DEVELOPED BY ZORO ⚔️",
      type: ActivityType.Playing,
    },
    {
      text: "Security Protocol: Encrypted & Locked",
      type: ActivityType.Playing,
    },
    {
      text: "Antinuke Shield (44 Flags) Active",
      type: ActivityType.Watching,
    },
    {
      text: "Sentinel-Scan: Monitoring Server",
      type: ActivityType.Watching,
    },
    {
      text: "Ready for Supremacy 🔱",
      type: ActivityType.Playing,
    },
  ];

  // Priority statuses (checked first)
  private priorityStatuses = {
    ashuActive: {
      text: "⚠️ SERVER UNDER ASHU CONTROL PROTOCOL 🔱",
      type: ActivityType.Watching,
    },
    zoroActive: {
      text: "🛠️ THE VC UNDER DEVELOPER ZORO ⚔️",
      type: ActivityType.Playing,
    },
    locked: {
      text: "🛡️ SECURITY PROTOCOL: ENCRYPTED & LOCKED",
      type: ActivityType.Watching,
    },
    stealth: {
      text: "🕵️ STEALTH MODE: GHOST MONITORING ACTIVE",
      type: ActivityType.Playing,
    },
  };

  constructor(client: Client, ashuId: string, zoroId: string) {
    this.client = client;
    this.ashuId = ashuId;
    this.zoroId = zoroId;
  }

  /**
   * Start the status rotation loop
   */
  start(intervalMs: number = 600000): void {
    console.log(
      `⏱️ Starting Status Rotator (interval: ${intervalMs / 1000 / 60} minutes)`
    );

    // Initial status
    this.updateStatus();

    // Rotate status every interval
    this.interval = setInterval(() => {
      this.updateStatus();
    }, intervalMs);
  }

  /**
   * Stop the status rotation
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log("⏹️ Status rotator stopped");
    }
  }

  /**
   * Get current status based on conditions
   */
  private getStatusBasedOnConditions(): StatusOption {
    // Check if Ashu is in any VC
    const ashuInVC = this.client.guilds.cache.some((guild) => {
      return guild.members.cache.get(this.ashuId)?.voice?.channel;
    });

    if (ashuInVC) {
      return this.priorityStatuses.ashuActive;
    }

    // Check if Zoro is in any VC
    const zoroInVC = this.client.guilds.cache.some((guild) => {
      return guild.members.cache.get(this.zoroId)?.voice?.channel;
    });

    if (zoroInVC) {
      return this.priorityStatuses.zoroActive;
    }

    // Check for active locks or raids (would integrate with antinuke module)
    // This is placeholder logic
    const hasActiveRaid = false; // Would be set by antinuke module
    if (hasActiveRaid) {
      return this.priorityStatuses.locked;
    }

    // Default: rotate through regular statuses
    const status = this.statuses[this.statusIndex];
    this.statusIndex = (this.statusIndex + 1) % this.statuses.length;

    return status;
  }

  /**
   * Update bot status
   */
  private updateStatus(): void {
    try {
      const status = this.getStatusBasedOnConditions();

      this.client.user?.setActivity(status.text, { type: status.type });

      console.log(
        `✅ Status updated: ${status.text.substring(0, 50)}... [${status.type}]`
      );
    } catch (error) {
      console.error("❌ Error updating status:", error);
    }
  }

  /**
   * Manually set a status
   */
  setStatus(text: string, type: ActivityType = ActivityType.Playing): void {
    try {
      this.client.user?.setActivity(text, { type });
      console.log(`✅ Manual status set: ${text}`);
    } catch (error) {
      console.error("❌ Error setting manual status:", error);
    }
  }

  /**
   * Add custom status
   */
  addStatus(text: string, type: ActivityType = ActivityType.Playing): void {
    this.statuses.push({ text, type });
    console.log(`✅ Status added to rotation pool`);
  }

  /**
   * Get current status count
   */
  getStatusCount(): number {
    return this.statuses.length;
  }

  /**
   * Force status update (useful for immediate changes)
   */
  forceUpdate(): void {
    this.updateStatus();
  }

  /**
   * Reset status to default rotation
   */
  reset(): void {
    this.statusIndex = 0;
    this.updateStatus();
  }
}

export default StatusRotator;
