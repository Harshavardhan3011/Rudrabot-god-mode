import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import { getOrCreateUserData, saveUserData } from "../../utils/helpers";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

const DAILY_REWARD = 500;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("econ-daily")
    .setDescription("Claim your daily reward"),

  name: "econ-daily",
  description: "Claim daily reward",
  category: "economy",
  module: "economy",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (10 seconds between claims for testing; would be 24h in production)
      const cooldownExpires = cooldowns.get(userId);
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `⏳ You must wait ${secondsLeft}s before claiming again.`,
          ephemeral: true,
        });
        return;
      }

      // Fetch user data
      const userData = await getOrCreateUserData(userId, interaction.user.username);
      if (!userData) {
        await interaction.reply({
          content: "❌ Could not load user data.",
          ephemeral: true,
        });
        return;
      }

      // Check if user already claimed today
      const lastDailyClaim = userData.dailyClaimedAt || 0;
      const dayInMs = 24 * 60 * 60 * 1000;
      const timeSinceLastClaim = now - lastDailyClaim;

      if (timeSinceLastClaim < dayInMs && lastDailyClaim > 0) {
        const hoursLeft = Math.ceil((dayInMs - timeSinceLastClaim) / (60 * 60 * 1000));
        await interaction.reply({
          content: `⏰ You already claimed today! Try again in **${hoursLeft}h**.`,
          ephemeral: true,
        });
        return;
      }

      // Award the daily reward
      userData.balance = (userData.balance || 0) + DAILY_REWARD;
      userData.totalEarned = (userData.totalEarned || 0) + DAILY_REWARD;
      userData.dailyClaimedAt = now;
      userData.updatedAt = now;

      // Save to database
      const saved = await saveUserData(userId, userData);
      if (!saved) {
        await interaction.reply({
          content: "❌ Failed to claim reward. Please try again.",
          ephemeral: true,
        });
        return;
      }

      // Set cooldown to prevent spam
      cooldowns.set(userId, now + 10000);

      // Build response embed
      const embed = new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle("🎉 Daily Reward Claimed!")
        .setDescription(`You earned **${DAILY_REWARD.toLocaleString()}** coins!`)
        .addFields(
          {
            name: "💵 New Balance",
            value: `**${userData.balance.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "📦 Next Claim",
            value: "In 24 hours",
            inline: true,
          },
          {
            name: "💡 Tip",
            value: "Use `/econ-work` to earn more coins!",
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x Economy System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "econ-daily",
        executorId: userId,
        guildId: interaction.guild?.id || "dm",
        details: { reward: DAILY_REWARD, newBalance: userData.balance },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /econ-daily:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred claiming your daily reward.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;

