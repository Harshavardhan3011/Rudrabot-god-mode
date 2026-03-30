/**
 * Blacklist Add Command - Add users to global blacklist (blocks all commands)
 * Owner/VIP only
 * Stores in JSON file with reason and timestamp
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

interface BlacklistRecord {
  userId: string;
  userName?: string;
  reason: string;
  addedAt: number;
  addedBy: string;
}

interface BlacklistDatabase {
  users: BlacklistRecord[];
}

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'blacklist.json');

export class BlacklistHandler {
  private static instance: BlacklistHandler;
  private db: BlacklistDatabase = { users: [] };

  private constructor() {
    this.loadDatabase();
  }

  static getInstance(): BlacklistHandler {
    if (!BlacklistHandler.instance) {
      BlacklistHandler.instance = new BlacklistHandler();
    }
    return BlacklistHandler.instance;
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
      console.error('❌ BlacklistHandler: Failed to load database:', error);
      this.db = { users: [] };
    }
  }

  private saveDatabase(): void {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_PATH, JSON.stringify(this.db, null, 2));
    } catch (error) {
      console.error('❌ BlacklistHandler: Failed to save database:', error);
    }
  }

  private ensureDataDir(): void {
    const dataDir = path.join(process.cwd(), 'src', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  isBlacklisted(userId: string): boolean {
    return this.db.users.some(u => u.userId === userId);
  }

  add(userId: string, reason: string, addedBy: string, userName?: string): BlacklistRecord {
    // Remove if already exists
    this.db.users = this.db.users.filter(u => u.userId !== userId);

    const record: BlacklistRecord = {
      userId,
      userName,
      reason,
      addedAt: Date.now(),
      addedBy,
    };

    this.db.users.push(record);
    this.saveDatabase();
    return record;
  }

  remove(userId: string): boolean {
    const initial = this.db.users.length;
    this.db.users = this.db.users.filter(u => u.userId !== userId);

    if (this.db.users.length < initial) {
      this.saveDatabase();
      return true;
    }

    return false;
  }

  getAll(): BlacklistRecord[] {
    return [...this.db.users];
  }

  getRecord(userId: string): BlacklistRecord | null {
    return this.db.users.find(u => u.userId === userId) || null;
  }
}

const blacklistHandler = BlacklistHandler.getInstance();

export const data = new SlashCommandBuilder()
  .setName('blacklist-add')
  .setDescription('Add a user to the global blacklist')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption(opt =>
    opt
      .setName('user')
      .setDescription('User to blacklist')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt
      .setName('reason')
      .setDescription('Reason for blacklist')
      .setRequired(true)
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
        action: 'blacklist-add',
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
    const reason = interaction.options.getString('reason', true);

    // Prevent self-blacklisting
    if (targetUser.id === interaction.user.id) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Self-targeting blocked')
        .setDescription("You can't blacklist yourself.");

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'blacklist-add',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetUser.id,
        targetName: targetUser.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Self-targeting attempt',
      });

      return;
    }

    // Prevent owner blacklisting
    if (permissionValidator.isOwner(targetUser.id)) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Cannot blacklist owner')
        .setDescription('Owners cannot be blacklisted.');

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'blacklist-add',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetId: targetUser.id,
        targetName: targetUser.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Attempted to blacklist owner',
      });

      return;
    }

    // Check if already blacklisted
    if (blacklistHandler.isBlacklisted(targetUser.id)) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FFAA00')
        .setTitle('⚠️ Already blacklisted')
        .setDescription(`${targetUser.tag} is already on the blacklist.`);

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      return;
    }

    // Add to blacklist
    const record = blacklistHandler.add(
      targetUser.id,
      reason,
      interaction.user.id,
      targetUser.tag
    );

    const successEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🚫 User Blacklisted')
      .setDescription(`**User:** ${targetUser.tag}`)
      .addFields(
        {
          name: 'Reason',
          value: reason,
          inline: false,
        },
        {
          name: 'User ID',
          value: `\`${targetUser.id}\``,
          inline: false,
        }
      )
      .setFooter({
        text: 'This user is now blocked from using all commands',
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [successEmbed],
      ephemeral: true,
    });

    auditLogger.log({
      action: 'blacklist-add',
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      targetId: targetUser.id,
      targetName: targetUser.tag,
      guildId: interaction.guildId!,
      guildName: interaction.guild?.name,
      details: { reason },
      success: true,
    });
  } catch (error) {
    console.error('❌ /blacklist-add error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}
