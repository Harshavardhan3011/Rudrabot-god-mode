/**
 * Anti-Raid Enable Command - Enable anti-raid protections
 * Owner/VIP only
 * Monitors for mass joins and applies slowmode/restrictions
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';
import DatabaseHandler from '../../database/dbHandler';

export interface RaidConfig {
  guildId: string;
  enabled: boolean;
  enabledAt: number;
  enabledBy: string;
  joinThreshold: number; // Members in timeWindow
  timeWindow: number; // milliseconds
  slowmodeSeconds: number;
  verificationLevel: string; // 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
}

export class AntiRaidHandler {
  private static instance: AntiRaidHandler;
  private joinTracker = new Map<string, number[]>(); // guildId -> [timestamps]

  private constructor() {}

  static getInstance(): AntiRaidHandler {
    if (!AntiRaidHandler.instance) {
      AntiRaidHandler.instance = new AntiRaidHandler();
    }
    return AntiRaidHandler.instance;
  }

  private get db() {
    return ((global as any).db as DatabaseHandler).getDb();
  }

  private mapRowToConfig(row: any): RaidConfig {
    return {
      guildId: row.guild_id,
      enabled: row.enabled === 1,
      enabledAt: row.enabled_at,
      enabledBy: row.enabled_by,
      joinThreshold: row.join_threshold,
      timeWindow: row.time_window,
      slowmodeSeconds: row.slowmode_seconds,
      verificationLevel: row.verification_level,
    };
  }

  enable(
    guildId: string,
    enabledBy: string,
    joinThreshold: number = 10,
    timeWindow: number = 30000, // 30 seconds
    slowmodeSeconds: number = 5
  ): RaidConfig {
    const enabledAt = Date.now();
    const verificationLevel = 'HIGH';

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO anti_raid_configs 
      (guild_id, enabled, enabled_at, enabled_by, join_threshold, time_window, slowmode_seconds, verification_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      guildId, 1, enabledAt, enabledBy, joinThreshold, timeWindow, slowmodeSeconds, verificationLevel
    );

    return {
      guildId,
      enabled: true,
      enabledAt,
      enabledBy,
      joinThreshold,
      timeWindow,
      slowmodeSeconds,
      verificationLevel,
    };
  }

  disable(guildId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM anti_raid_configs WHERE guild_id = ?');
    const info = stmt.run(guildId);
    return info.changes > 0;
  }

  getConfig(guildId: string): RaidConfig | null {
    const stmt = this.db.prepare('SELECT * FROM anti_raid_configs WHERE guild_id = ?');
    const row = stmt.get(guildId);
    return row ? this.mapRowToConfig(row) : null;
  }

  isEnabled(guildId: string): boolean {
    const config = this.getConfig(guildId);
    return config?.enabled || false;
  }

  trackJoin(guildId: string): number {
    const now = Date.now();
    const config = this.getConfig(guildId);
    if (!config || !config.enabled) return 0;

    if (!this.joinTracker.has(guildId)) {
      this.joinTracker.set(guildId, []);
    }

    const joins = this.joinTracker.get(guildId)!;
    // Remove old entries outside time window
    const filtered = joins.filter(t => now - t < config.timeWindow);
    filtered.push(now);

    this.joinTracker.set(guildId, filtered);
    return filtered.length;
  }

  isRaidDetected(guildId: string): boolean {
    const config = this.getConfig(guildId);
    if (!config || !config.enabled) return false;

    const joinCount = this.joinTracker.get(guildId)?.length || 0;
    return joinCount >= config.joinThreshold;
  }
}

const raidHandler = AntiRaidHandler.getInstance();

export const data = new SlashCommandBuilder()
  .setName('anti-raid-enable')
  .setDescription('Enable anti-raid protections')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(opt =>
    opt
      .setName('join_threshold')
      .setDescription('Members to join within timewindow to trigger (default 10)')
      .setRequired(false)
      .setMinValue(3)
      .setMaxValue(50)
  )
  .addIntegerOption(opt =>
    opt
      .setName('time_window')
      .setDescription('Time window in seconds (default 30)')
      .setRequired(false)
      .setMinValue(10)
      .setMaxValue(300)
  )
  .addIntegerOption(opt =>
    opt
      .setName('slowmode')
      .setDescription('Slowmode seconds when raid detected (default 5)')
      .setRequired(false)
      .setMinValue(0)
      .setMaxValue(21600)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Authorization check
    if (!permissionValidator.validateInteraction(interaction)) {
      const denyEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Unauthorized')
        .setDescription('Only owners and VIPs can use this command.');

      await interaction.reply({
        embeds: [denyEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'anti-raid-enable',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Unauthorized attempt',
      });

      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      throw new Error('Guild not found');
    }

    // Get options
    const joinThreshold = interaction.options.getInteger('join_threshold') || 10;
    const timeWindow = (interaction.options.getInteger('time_window') || 30) * 1000; // Convert to ms
    const slowmodeSeconds = interaction.options.getInteger('slowmode') || 5;

    // Check if already enabled
    if (raidHandler.isEnabled(guild.id)) {
      const warningEmbed = new EmbedBuilder()
        .setColor('#FFAA00')
        .setTitle('⚠️ Already enabled')
        .setDescription('Anti-raid is already enabled in this server.');

      await interaction.reply({
        embeds: [warningEmbed],
        ephemeral: true,
      });

      return;
    }

    // Enable anti-raid
    const config = raidHandler.enable(
      guild.id,
      interaction.user.id,
      joinThreshold,
      timeWindow,
      slowmodeSeconds
    );

    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🛡️ Anti-Raid Enabled')
      .setDescription('Raid detection is now active.')
      .addFields(
        {
          name: 'Join Threshold',
          value: `${joinThreshold} members`,
          inline: true,
        },
        {
          name: 'Time Window',
          value: `${timeWindow / 1000}s`,
          inline: true,
        },
        {
          name: 'Auto Slowmode',
          value: `${slowmodeSeconds}s`,
          inline: true,
        },
        {
          name: 'How it works',
          value:
            'When ' +
            joinThreshold +
            ' members join within ' +
            timeWindow / 1000 +
            ' seconds, manual slowmode triggers. Monitor audit logs.',
          inline: false,
        }
      )
      .setFooter({ text: 'Use /anti-raid-disable to turn off' })
      .setTimestamp();

    await interaction.reply({
      embeds: [successEmbed],
      ephemeral: true,
    });

    auditLogger.log({
      action: 'anti-raid-enable',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      guildId: guild.id,
      guildName: guild.name,
      details: { joinThreshold, timeWindow, slowmodeSeconds },
      success: true,
    });
  } catch (error) {
    console.error('❌ /anti-raid-enable error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}

// Export instances for use in event listeners
export { raidHandler };
