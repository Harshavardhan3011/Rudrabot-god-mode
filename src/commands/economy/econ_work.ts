import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import { getOrCreateUserData, saveUserData, getRandomInt } from "../../utils/helpers";
import { AuditLogger } from "../../database/auditLogger";

const auditLogger = AuditLogger.getInstance();
const cooldowns = new Map<string, number>();

// Work job types with min/max rewards
const WORK_JOBS = {
  "Cashier": { min: 50, max: 150 },
  "Freelancer": { min: 100, max: 300 },
  "Tutoring": { min: 75, max: 250 },
  "Content Creator": { min: 150, max: 400 },
  "Delivery Driver": { min: 80, max: 200 },
  "Teacher": { min: 120, max: 350 },
  "Developer": { min: 200, max: 500 },
  "Consultant": { min: 180, max: 450 },
};

const jobNames = Object.keys(WORK_JOBS);

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("econ-work")
    .setDescription("Work to earn coins"),

  name: "econ-work",
  description: "Work to earn coins",
  category: "economy",
  module: "economy",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const userId = interaction.user.id;
      const now = Date.now();

      // Cooldown check (30 seconds between work shifts)
      const cooldownExpires = cooldowns.get(userId);
      if (cooldownExpires && cooldownExpires > now) {
        const secondsLeft = Math.ceil((cooldownExpires - now) / 1000);
        await interaction.reply({
          content: `😮 You need to rest. Try again in **${secondsLeft}s**.`,
          ephemeral: true,
        });
        return;
      }

      // Defer reply (might take time)
      await interaction.deferReply();

      // Fetch user data
      const userData = await getOrCreateUserData(userId, interaction.user.username);
      if (!userData) {
        await interaction.editReply({
          content: "❌ Could not load user data.",
        });
        return;
      }

      // Pick random job and reward
      const job = jobNames[Math.floor(Math.random() * jobNames.length)];
      const jobDetails = WORK_JOBS[job as keyof typeof WORK_JOBS];
      const earnedCoins = getRandomInt(jobDetails.min, jobDetails.max);

      // Simulate work with random success chance (90% success, 10% fail and earn 0)
      const successChance = Math.random() > 0.1; // 90% success rate
      const finalEarnings = successChance ? earnedCoins : 0;

      // Update user data
      userData.balance = (userData.balance || 0) + finalEarnings;
      userData.totalEarned = (userData.totalEarned || 0) + finalEarnings;
      userData.updatedAt = now;

      // Save to database
      const saved = await saveUserData(userId, userData);
      if (!saved) {
        await interaction.editReply({
          content: "❌ Failed to save work earnings. Please try again.",
        });
        return;
      }

      // Set cooldown (30 seconds)
      cooldowns.set(userId, now + 30000);

      // Build response embed
      const embed = new EmbedBuilder()
        .setColor(successChance ? 0x10B981 : 0xEF4444)
        .setTitle(`💼 Work Shift - ${job}`)
        .setDescription(
          successChance
            ? `You completed your shift successfully!`
            : `You didn't complete your shift. Try again next time!`
        )
        .addFields(
          {
            name: successChance ? "✅ Earnings" : "❌ Earnings",
            value: successChance 
              ? `**+${finalEarnings.toLocaleString()}** coins`
              : "0 coins",
            inline: true,
          },
          {
            name: "💵 New Balance",
            value: `**${userData.balance.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "📊 Job Details",
            value: `Base Reward: ${jobDetails.min}-${jobDetails.max} coins\nSuccess Rate: 90%`,
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x Economy System" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log action
      auditLogger.log({
        action: "econ-work",
        executorId: userId,
        guildId: interaction.guild?.id || "dm",
        details: { 
          job,
          earnedCoins: finalEarnings,
          success: successChance,
          newBalance: userData.balance,
        },
        success: true,
      });

    } catch (error) {
      console.error("❌ Error in /econ-work:", error);
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred during work.",
          ephemeral: true,
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ An error occurred during work.",
        });
      }
    }
  },
};

export default command;

