/**
 * Nickname Lock Command - Lock a user's nickname (prevent changes)
 * Owner/VIP only
 * Uses guildMemberUpdate listener to revert changes
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';

interface NicknameLockRecord {
  userId: string;
  guildId: string;
  lockedNickname: string;
  lockedAt: number;
  lockedBy: string;
  reason: string;
}

interface NicknameLockDatabase {
  locks: NicknameLockRecord[];
}

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'nickname-locks.json');

export class NicknameLockHandler {
  private static instance: NicknameLockHandler;
  private db: NicknameLockDatabase = { locks: [] };

  private constructor() {
    this.loadDatabase();
  }

  static getInstance(): NicknameLockHandler {
    if (!NicknameLockHandler.instance) {
      NicknameLockHandler.instance = new NicknameLockHandler();
    }
    return NicknameLockHandler.instance;
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
      console.error('❌ NicknameLockHandler: Failed to load database:', error);
      this.db = { locks: [] };
    }
  }

  private saveDatabase(): void {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_PATH, JSON.stringify(this.db, null, 2));
    } catch (error) {
      console.error('❌ NicknameLockHandler: Failed to save database:', error);
    }
  }

  private ensureDataDir(): void {
    const dataDir = path.join(process.cwd(), 'src', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  lock(userId: string, guildId: string, nickname: string, lockedBy: string, reason: string): NicknameLockRecord {
    // Remove if already exists
    this.db.locks = this.db.locks.filter(l => !(l.userId === userId && l.guildId === guildId));

    const record: NicknameLockRecord = {
      userId,
      guildId,
      lockedNickname: nickname,
      lockedAt: Date.now(),
      lockedBy,
      reason,
    };

    this.db.locks.push(record);
    this.saveDatabase();
    return record;
  }

  unlock(userId: string, guildId: string): boolean {
    const initial = this.db.locks.length;
    this.db.locks = this.db.locks.filter(l => !(l.userId === userId && l.guildId === guildId));

    if (this.db.locks.length < initial) {
      this.saveDatabase();
      return true;
    }

    return false;
  }

  getLock(userId: string, guildId: string): NicknameLockRecord | null {
    return this.db.locks.find(l => l.userId === userId && l.guildId === guildId) || null;
  }

  isLocked(userId: string, guildId: string): boolean {
    return this.db.locks.some(l => l.userId === userId && l.guildId === guildId);
  }

  getAll(): NicknameLockRecord[] {
    return [...this.db.locks];
  }
}

const lockHandler = NicknameLockHandler.getInstance();

export const data = new SlashCommandBuilder()
  .setName('nickname-lock')
  .setDescription('Lock a user\'s nickname (prevent changes)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption(opt =>
    opt
      .setName('user')
      .setDescription('User whose nickname to lock')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt
      .setName('reason')
      .setDescription('Reason for lock')
      .setRequired(false)
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
        action: 'nickname-lock',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Unauthorized attempt',
      });

      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guild = interaction.guild;

    if (!guild) {
      throw new Error('Guild not found');
    }

    // Prevent self-locking
    if (targetUser.id === interaction.user.id) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Self-targeting blocked')
        .setDescription("You can't lock your own nickname.");

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'nickname-lock',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetUser.id,
        targetName: targetUser.tag,
        guildId: guild.id,
        guildName: guild.name,
        success: false,
        error: 'Self-targeting attempt',
      });

      return;
    }

    // Get target member
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Member not found')
        .setDescription(`${targetUser.tag} is not a member of this server.`);

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      return;
    }

    // Check if already locked
    if (lockHandler.isLocked(targetUser.id, guild.id)) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FFAA00')
        .setTitle('⚠️ Already locked')
        .setDescription(`${targetUser.tag}'s nickname is already locked.`);

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      return;
    }

    // Get current nickname (or username if no nickname)
    const currentNickname = targetMember.nickname || targetUser.username;

    // Lock the nickname
    const record = lockHandler.lock(
      targetUser.id,
      guild.id,
      currentNickname,
      interaction.user.id,
      reason
    );

    const successEmbed = new EmbedBuilder()
      .setColor('#FF6600')
      .setTitle('🔐 Nickname Locked')
      .setDescription(`**User:** ${targetUser.tag}`)
      .addFields(
        {
          name: 'Locked Nickname',
          value: `\`${currentNickname}\``,
          inline: true,
        },
        {
          name: 'Locked At',
          value: new Date(record.lockedAt).toLocaleString(),
          inline: true,
        },
        {
          name: 'Reason',
          value: reason,
          inline: false,
        }
      )
      .setFooter({
        text: 'Any nickname changes will be automatically reverted.',
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [successEmbed],
      ephemeral: true,
    });

    auditLogger.log({
      action: 'nickname-lock',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      targetId: targetUser.id,
      targetName: targetUser.tag,
      guildId: guild.id,
      guildName: guild.name,
      details: { nickname: currentNickname, reason },
      success: true,
    });
  } catch (error) {
    console.error('❌ /nickname-lock error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}

// Export instance for use in guildMemberUpdate listener
export { lockHandler };
