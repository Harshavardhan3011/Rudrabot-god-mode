/**
 * Reload Module Command - Reload a specific command module/file
 * Owner only
 * Clears Node require cache and reloads module
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import path from 'path';
import auditLogger from '../../database/auditLogger';
import permissionValidator from '../../utils/permissionValidator';

export const data = new SlashCommandBuilder()
  .setName('reload-module')
  .setDescription('Reload a command module (hot reload)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt =>
    opt
      .setName('module')
      .setDescription('Module path (e.g., owner/vip, voice/vc_lock)')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Authorization check - Owner only
    if (!permissionValidator.isOwner(interaction.user.id)) {
      const denyEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Owner Only')
        .setDescription('This command is restricted to server owners.');

      await interaction.reply({
        embeds: [denyEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'reload-module',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        success: false,
        error: 'Non-owner attempt',
      });

      return;
    }

    const moduleName = interaction.options.getString('module', true);

    try {
      // Construct module path
      const modulePath = path.resolve(
        process.cwd(),
        'src',
        'commands',
        `${moduleName}.ts`
      );

      // Resolve to absolute path for require
      const resolvedPath = require.resolve(modulePath);

      // Clear from cache
      delete require.cache[resolvedPath];

      // Attempt to reload
      const reloadedModule = require(resolvedPath);

      if (!reloadedModule.data) {
        throw new Error('Module does not export SlashCommandBuilder data');
      }

      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Module Reloaded')
        .addFields(
          {
            name: 'Module',
            value: `\`${moduleName}\``,
            inline: true,
          },
          {
            name: 'Command',
            value: `\`/${reloadedModule.data.name}\``,
            inline: true,
          },
          {
            name: 'Path',
            value: `\`${modulePath}\``,
            inline: false,
          }
        )
        .setFooter({ text: 'Module reloaded successfully' })
        .setTimestamp();

      await interaction.reply({
        embeds: [successEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'reload-module',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        details: { moduleName, commandName: reloadedModule.data.name },
        success: true,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Reload Failed')
        .addFields(
          {
            name: 'Module',
            value: `\`${moduleName}\``,
            inline: true,
          },
          {
            name: 'Error',
            value: `\`${errorMsg}\``,
            inline: false,
          }
        )
        .setFooter({
          text: 'Check module path and syntax',
        });

      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });

      auditLogger.log({
        action: 'reload-module',
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guildId!,
        guildName: interaction.guild?.name,
        details: { moduleName },
        success: false,
        error: errorMsg,
      });
    }
  } catch (error) {
    console.error('❌ /reload-module error:', error);
    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}
