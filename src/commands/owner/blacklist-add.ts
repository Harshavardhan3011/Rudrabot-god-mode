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
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';
import DatabaseHandler from '../../database/dbHandler';

export interface BlacklistRecord {
  userId: string;
  userName?: string;
  reason: string;
  addedAt: number;
  addedBy: string;
}

export class BlacklistHandler {
  private static instance: BlacklistHandler;

  private constructor() {}

  static getInstance(): BlacklistHandler {
    if (!BlacklistHandler.instance) {
      BlacklistHandler.instance = new BlacklistHandler();
    }
    return BlacklistHandler.instance;
  }

  private get db() {
    return ((global as any).db as DatabaseHandler).getDb();
  }

  private mapRowToRecord(row: any): BlacklistRecord {
    return {
      userId: row.user_id,
      userName: row.user_name || undefined,
      reason: row.reason,
      addedAt: row.added_at,
      addedBy: row.added_by,
    };
  }

  isBlacklisted(userId: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM blacklisted_users WHERE user_id = ?');
    const row = stmt.get(userId);
    return !!row;
  }

  add(userId: string, reason: string, addedBy: string, userName?: string): BlacklistRecord {
    const addedAt = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO blacklisted_users (user_id, user_name, reason, added_at, added_by)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(userId, userName || null, reason, addedAt, addedBy);

    return {
      userId,
      userName,
      reason,
      addedAt,
      addedBy,
    };
  }

  remove(userId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM blacklisted_users WHERE user_id = ?');
    const info = stmt.run(userId);
    return info.changes > 0;
  }

  getAll(): BlacklistRecord[] {
    const stmt = this.db.prepare('SELECT * FROM blacklisted_users');
    const rows = stmt.all();
    return rows.map((row: any) => this.mapRowToRecord(row));
  }

  getRecord(userId: string): BlacklistRecord | null {
    const stmt = this.db.prepare('SELECT * FROM blacklisted_users WHERE user_id = ?');
    const row = stmt.get(userId);
    return row ? this.mapRowToRecord(row) : null;
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
