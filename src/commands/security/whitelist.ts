/**
 * WHITELIST COMMAND - Unified Owner-Only Management
 * Subcommands: add, remove, list
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { getOrCreateGuildData, saveGuildData } from '../../database/guildSecurityMatrix';

export const data = new SlashCommandBuilder()
  .setName('whitelist')
  .setDescription('Whitelist management (Owner only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('Add a user to whitelist')
      .addUserOption((opt) =>
        opt.setName('user').setDescription('User to whitelist').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('reason').setDescription('Reason for whitelisting').setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('Remove a user from whitelist')
      .addUserOption((opt) =>
        opt.setName('user').setDescription('User to remove').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('list').setDescription('View all whitelisted users')
  );

export const name = 'whitelist';
export const description = 'Whitelist management';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Check if user is bot owner
    const ownerId = process.env.ASHU_ID;
    if (!ownerId || interaction.user.id !== ownerId) {
      await interaction.reply({
        content: '❌ This command is restricted to bot owners only.',
        ephemeral: true,
      });
      return;
    }

    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();
    const guildData = await getOrCreateGuildData(
      interaction.guild.id,
      interaction.guild.name,
      interaction.guild.ownerId
    );

    if (subcommand === 'add') {
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason') || 'No reason provided';

      const existingEntry = guildData.whitelist.find(
        (entry: { userId: string }) => entry.userId === user.id
      );

      if (existingEntry) {
        await interaction.editReply(`⚠️ User **${user.tag}** is already whitelisted.`).catch(() => null);
        return;
      }

      guildData.whitelist.push({
        userId: user.id,
        username: user.tag,
        reason,
        addedAt: new Date().toISOString(),
      });

      const saved = await saveGuildData(interaction.guild.id, guildData);
      if (!saved) {
        await interaction.editReply('❌ Failed to save to database.').catch(() => null);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#22C55E')
        .setTitle('✅ User Whitelisted')
        .setDescription(`${user} has been added to the whitelist.`)
        .addFields(
          { name: 'User ID', value: user.id, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setFooter({ text: 'RUDRA.0x Whitelist Manager' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] }).catch(() => null);
    } else if (subcommand === 'remove') {
      const user = interaction.options.getUser('user', true);

      const index = guildData.whitelist.findIndex(
        (entry: { userId: string }) => entry.userId === user.id
      );

      if (index === -1) {
        await interaction.editReply(
          `⚠️ User **${user.tag}** is not in the whitelist.`
        ).catch(() => null);
        return;
      }

      guildData.whitelist.splice(index, 1);

      const saved = await saveGuildData(interaction.guild.id, guildData);
      if (!saved) {
        await interaction.editReply('❌ Failed to save to database.').catch(() => null);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#EF4444')
        .setTitle('✅ User Removed')
        .setDescription(`${user} has been removed from the whitelist.`)
        .setFooter({ text: 'RUDRA.0x Whitelist Manager' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] }).catch(() => null);
    } else if (subcommand === 'list') {
      if (!guildData.whitelist || guildData.whitelist.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#F59E0B')
          .setTitle('📋 Whitelist - Empty')
          .setDescription('No users are currently whitelisted.')
          .setFooter({ text: 'RUDRA.0x Whitelist Manager' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] }).catch(() => null);
        return;
      }

      const whitelistText = guildData.whitelist
        .map(
          (entry: { username: string; userId: string; reason: string; addedAt: string }, i: number) =>
            `**${i + 1}.** ${entry.username} (${entry.userId})\n   └ Reason: ${entry.reason}\n   └ Added: ${new Date(entry.addedAt).toLocaleDateString()}`
        )
        .join('\n\n');

      const embed = new EmbedBuilder()
        .setColor('#3B82F6')
        .setTitle('📋 Whitelist Users')
        .setDescription(whitelistText || 'None')
        .setFooter({
          text: `Total: ${guildData.whitelist.length} | RUDRA.0x Whitelist Manager`,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Error in whitelist command:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('❌ An error occurred.').catch(() => null);
    } else {
      await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => null);
    }
  }
}
