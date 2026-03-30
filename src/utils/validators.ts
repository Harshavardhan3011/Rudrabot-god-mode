// 🔱 RUDRA.0x Validators Utility
// Input validation helpers for commands

class Validators {
  /**
   * Validate Discord User ID
   */
  static isValidUserId(id: string): boolean {
    return /^\d{17,19}$/.test(id);
  }

  /**
   * Validate Discord Server ID
   */
  static isValidGuildId(id: string): boolean {
    return /^\d{17,19}$/.test(id);
  }

  /**
   * Validate coin amount
   */
  static isValidCoins(amount: number): boolean {
    return Number.isInteger(amount) && amount > 0 && amount <= 999999999;
  }

  /**
   * Validate duration string (e.g., "10m", "1h", "7d")
   */
  static parseDuration(durationStr: string): number | null {
    const match = durationStr.match(/^(\d+)([smhd])$/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers: { [key: string]: number } = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (multipliers[unit] || 0);
  }

  /**
   * Validate hex color code
   */
  static isValidHexColor(hex: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(hex);
  }

  /**
   * Check if string is safe (no special exploit chars)
   */
  static isSafeString(str: string): boolean {
    // Block code injection attempts
    const dangerousPatterns = [
      /```/g, // Code blocks
      /eval\(/gi, // eval functions
      /exec\(/gi, // exec functions
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(str));
  }

  /**
   * Validate email
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate IP address
   */
  static isValidIp(ip: string): boolean {
    const ipv4Regex =
      /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
    return ipv4Regex.test(ip);
  }

  /**
   * Sanitize username (allow alphanumeric, underscore, dash)
   */
  static sanitizeUsername(username: string): string {
    return username.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  }

  /**
   * Check if string contains zalgo text
   */
  static containsZalgo(text: string): boolean {
    const zalgoRegex = /[\u0300-\u036F\u0483-\u0489]/g;
    return zalgoRegex.test(text);
  }

  /**
   * Check if string is all caps
   */
  static isAllCaps(text: string): boolean {
    const letters = text.match(/[a-z]/g);
    return letters === null && text.match(/[A-Z]/g) !== null;
  }

  /**
   * Count mentions in text
   */
  static countMentions(text: string): number {
    const mentions = text.match(/<@!?\d+>/g);
    return mentions ? mentions.length : 0;
  }

  /**
   * Validate permission array
   */
  static isValidPermissionArray(permissions: string[]): boolean {
    const validPerms = [
      "ADMINISTRATOR",
      "MANAGE_GUILD",
      "MANAGE_ROLES",
      "MANAGE_CHANNELS",
      "MANAGE_MESSAGES",
      "MODERATE_MEMBERS",
      "BAN_MEMBERS",
      "KICK_MEMBERS",
    ];

    return permissions.every((perm) => validPerms.includes(perm));
  }
}

export default Validators;
