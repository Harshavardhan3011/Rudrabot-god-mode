import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types";
import auditLogger from "../../database/auditLogger";

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 3000;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("mod-purge")
    .setDescription("Delete recent messages from this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName("count")
        .setDescription("Number of messages to delete (1-100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),
  name: "mod-purge",
  description: "Purge recent messages",
  category: "moderation",
  module: "moderation",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const now = Date.now();
    const lastUsed = cooldowns.get(interaction.user.id) || 0;
    if (now - lastUsed < COOLDOWN_MS) {
      await interaction.reply({
        content: `⏳ Cooldown active. Try again in ${Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000)}s.`,
        ephemeral: true,
      });
      return;
    }
    cooldowns.set(interaction.user.id, now);

    if (!interaction.guild || !interaction.channel) {
      await interaction.reply({ content: "This command can only be used in a server channel.", ephemeral: true });
      return;
    }
    if (interaction.channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "❌ Purge can only run in text channels.", ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({ content: "❌ You need Manage Messages permission.", ephemeral: true });
      return;
    }

    const me = interaction.guild.members.me;
    if (!me?.permissionsIn(interaction.channel).has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({ content: "❌ I need Manage Messages permission in this channel.", ephemeral: true });
      return;
    }

    const count = interaction.options.getInteger("count", true);
    try {
      const deleted = await interaction.channel.bulkDelete(count, true);

      auditLogger.log({
        action: "mod-purge",
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        details: {
          requestedCount: count,
          deletedCount: deleted.size,
          channelId: interaction.channel.id,
        },
        success: true,
      });

      console.log(`✅ /mod-purge executed by ${interaction.user.tag}, deleted ${deleted.size} messages`);
      await interaction.reply({
        content: `✅ Deleted **${deleted.size}** message(s) in ${interaction.channel}.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("mod-purge failed:", error);
      auditLogger.log({
        action: "mod-purge",
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        details: {
          requestedCount: count,
          channelId: interaction.channel.id,
        },
        success: false,
        error: String(error),
      });
      await interaction.reply({ content: "❌ Failed due to real error while purging messages.", ephemeral: true });
    }
  },
};

export default command;

