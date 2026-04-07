/**
 * Server Backup Command - Create a snapshot of server data (channels, roles, config)
 * Owner/VIP only
 * Saves backup metadata into SQLite database
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

interface BackupData {
  id: string;
  guildId: string;
  guildName: string;
  createdAt: number;
  createdBy: string;
  channels: Array<{
    id: string;
    name: string;
    type: string;
    parentId: string | null;
  }>;
  roles: Array<{
    id: string;
    name: string;
    color: number;
    permissions: string; // Store as string for backup safely
  }>;
  memberCount: number;
  ownerId: string;
}

export const data = new SlashCommandBuilder()
  .setName('server-backup')
  .setDescription('Create a backup of server configuration and structure')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

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
        action: 'server-backup',
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

    await interaction.deferReply({ ephemeral: true });

    try {
      // Collect channel data
      const channels = Array.from(guild.channels.cache.values()).map(ch => ({
        id: ch.id,
        name: ch.name,
        type: ch.type.toString(),
        parentId: 'parent' in ch ? (ch.parent?.id || null) : null,
      }));

      // Collect role data
      const roles = Array.from(guild.roles.cache.values()).map(r => ({
        id: r.id,
        name: r.name,
        color: r.color,
        permissions: r.permissions.bitfield.toString(), // Convert BigInt to string safely
      }));

      // Fetch member count
      await guild.members.fetch().catch(() => null);
      const memberCount = guild.memberCount;

      // Create backup object
      const backupId = `${guild.id}-${Date.now()}`;
      const createdAt = Date.now();
      const createdBy = interaction.user.id;
      
      const backup: BackupData = {
        id: backupId,
        guildId: guild.id,
        guildName: guild.name,
        createdAt,
        createdBy,
        channels,
        roles,
        memberCount,
        ownerId: guild.ownerId,
      };

      // Save backup to SQLite
      const db = ((global as any).db as DatabaseHandler).getDb();
      const stmt = db.prepare(`
        INSERT INTO server_backups (id, guild_id, created_at, created_by, data)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(backupId, guild.id, createdAt, createdBy, JSON.stringify(backup));

      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Server Backup Created')
        .setDescription(`Backup ID: \`${backupId}\``)
        .addFields(
          {
            name: 'Channels Backed Up',
            value: `${channels.length}`,
            inline: true,
          },
          {
            name: 'Roles Backed Up',
            value: `${roles.length}`,
            inline: true,
          },
          {
            name: 'Members',
            value: `${memberCount}`,
            inline: true,
          },
          {
            name: 'Storage',
            value: '`SQLite Backend (server_backups table)`',
            inline: false,
          }
        )
        .setFooter({
          text: 'Backups are configuration snapshots only. Use for reference or recovery planning.',
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [successEmbed],
      });

      auditLogger.log({
        action: 'server-backup',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: guild.id,
        guildName: guild.name,
        details: {
          backupId,
          channelsCount: channels.length,
          rolesCount: roles.length,
          memberCount,
        },
        success: true,
      });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Backup Failed')
        .setDescription(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

      await interaction.editReply({
        embeds: [errorEmbed],
      });

      auditLogger.log({
        action: 'server-backup',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: guild.id,
        guildName: guild.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } catch (error) {
    console.error('❌ /server-backup error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}

