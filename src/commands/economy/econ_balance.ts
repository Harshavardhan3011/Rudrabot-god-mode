import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import { getOrCreateUserData, saveUserData } from "../../utils/helpers";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("econ-balance")
    .setDescription("Check wallet balance")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User to check balance for (default: yourself)")
        .setRequired(false)
    ),

  name: "econ-balance",
  description: "Check wallet balance",
  category: "economy",
  module: "economy",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      // Cooldown check (5 seconds per user)
      const userId = interaction.user.id;
      const now = Date.now();
      const cooldownExpires = cooldowns.get(userId);
      
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ Command on cooldown. Try again in ${secondsLeft}s.`,
          ephemeral: true,
        });
        return;
      }

      cooldowns.set(userId, now + 5000);

      const targetUser = interaction.options.getUser("user") || interaction.user;
      
      // Fetch user data
      const userData = await getOrCreateUserData(targetUser.id, targetUser.username);
      if (!userData) {
        await interaction.reply({
          content: "❌ Could not load user data.",
          ephemeral: true,
        });
        return;
      }

      const isOwn = targetUser.id === interaction.user.id;
      const balance = userData.balance || 0;
      const bank = userData.bank || 0;
      const totalEarned = userData.totalEarned || 0;
      const totalSpent = userData.totalSpent || 0;

      // Build wallet embed
      const embed = new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle(`💰 Wallet - ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 512 }))
        .addFields(
          {
            name: "💵 Liquid Balance",
            value: `**${balance.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "🏦 Bank",
            value: `**${bank.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "💎 Total Assets",
            value: `**${(balance + bank).toLocaleString()}** coins`,
            inline: false,
          },
          {
            name: "📈 Statistics",
            value: `Earned: **${totalEarned.toLocaleString()}**\nSpent: **${totalSpent.toLocaleString()}**`,
            inline: false,
          }
        );

      if (isOwn) {
        embed.addFields({
          name: "💡 Tips",
          value: "Use `/econ-daily` for daily rewards\nUse `/econ-work` to earn coins",
          inline: false,
        });
      }

      embed.setFooter({ text: `RUDRA.0x Economy System` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "econ-balance",
        executorId: userId,
        targetId: targetUser.id,
        targetName: targetUser.username,
        guildId: interaction.guild?.id || "dm",
        details: { balance, bank, totalAssets: balance + bank },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /econ-balance:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred checking balance.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

