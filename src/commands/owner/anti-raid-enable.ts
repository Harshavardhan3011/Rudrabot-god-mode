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
import fs from 'fs';
import path from 'path';
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';

interface RaidConfig {
  guildId: string;
  enabled: boolean;
  enabledAt: number;
  enabledBy: string;
  joinThreshold: number; // Members in timeWindow
  timeWindow: number; // milliseconds
  slowmodeSeconds: number;
  verificationLevel: string; // 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
}

interface RaidDatabase {
  configs: RaidConfig[];
}

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'anti-raid.json');

export class AntiRaidHandler {
  private static instance: AntiRaidHandler;
  private db: RaidDatabase = { configs: [] };
  private joinTracker = new Map<string, number[]>(); // guildId -> [timestamps]

  private constructor() {
    this.loadDatabase();
  }

  static getInstance(): AntiRaidHandler {
    if (!AntiRaidHandler.instance) {
      AntiRaidHandler.instance = new AntiRaidHandler();
    }
    return AntiRaidHandler.instance;
  }

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
      console.error('❌ AntiRaidHandler: Failed to load database:', error);
      this.db = { configs: [] };
    }
  }

  private saveDatabase(): void {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_PATH, JSON.stringify(this.db, null, 2));
    } catch (error) {
      console.error('❌ AntiRaidHandler: Failed to save database:', error);
    }
  }

  private ensureDataDir(): void {
    const dataDir = path.join(process.cwd(), 'src', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  enable(
    guildId: string,
    enabledBy: string,
    joinThreshold: number = 10,
    timeWindow: number = 30000, // 30 seconds
    slowmodeSeconds: number = 5
  ): RaidConfig {
    // Remove if already exists
    this.db.configs = this.db.configs.filter(c => c.guildId !== guildId);

    const config: RaidConfig = {
      guildId,
      enabled: true,
      enabledAt: Date.now(),
      enabledBy,
      joinThreshold,
      timeWindow,
      slowmodeSeconds,
      verificationLevel: 'HIGH',
    };

    this.db.configs.push(config);
    this.saveDatabase();
    return config;
  }

  disable(guildId: string): boolean {
    const initial = this.db.configs.length;
    this.db.configs = this.db.configs.filter(c => c.guildId !== guildId);

    if (this.db.configs.length < initial) {
      this.saveDatabase();
      return true;
    }

    return false;
  }

  getConfig(guildId: string): RaidConfig | null {
    return this.db.configs.find(c => c.guildId === guildId) || null;
  }

  isEnabled(guildId: string): boolean {
    const config = this.getConfig(guildId);
    return config?.enabled || false;
  }

  trackJoin(guildId: string): number {
    const now = Date.now();
    const config = this.getConfig(guildId);
    if (!config) return 0;

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
    if (!config) return false;

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
