// 🔱 RUDRA.0x Command Template
// Copy this file as a starting point for new commands

import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "./src/types";

/**
 * Template Command Structure
 * Replace [COMMAND_NAME] with your command name
 * Place this file in: src/commands/[MODULE]/[command-name].ts
 */

const templateCommand: Command = {
  // Required: Command name (used in /name)
  name: "template",

  // Required: Short description (shown in help)
  description: "This is a template command",

  // Required: Category (for organizing help menu)
  category: "utility",

  // Required: Module name (for grouping)
  module: "utility",

  // Optional: Owner-only flag (Ashu only)
  ownerOnly: false,

  // Optional: VIP-only flag
  vipOnly: false,

  // Optional: Required permissions (e.g., ["ADMINISTRATOR", "MODERATE_MEMBERS"])
  permissions: [],

  // Optional: Cooldown in milliseconds (0 = no cooldown)
  cooldown: 0,

  /**
   * Main command execution
   * This is called when the slash command is used
   */
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Get values from command options (if any)
      const userInput = interaction.options.getString("input");

      // Create response embed
      const embed = new EmbedBuilder()
        .setColor("#00FFFF")
        .setTitle("✨ Template Command")
        .setDescription("This is a template response")
        .addFields(
          {
            name: "Your Input",
            value: userInput || "No input provided",
          },
          {
            name: "User",
            value: `${interaction.user.tag} (${interaction.user.id})`,
          }
        )
        .setFooter({
          text: "Powered by RUDRA.0x",
        })
        .setTimestamp();

      // Send response
      await interaction.reply({
        embeds: [embed],
        ephemeral: false, // Set to true for private response
      });

      // Log command execution
      console.log(
        `✅ Command executed: /template (User: ${interaction.user.tag})`
      );
    } catch (error) {
      console.error("❌ Error in template command:", error);

      await interaction.reply({
        content: "❌ There was an error executing this command.",
        ephemeral: true,
      });
    }
  },
};

export default templateCommand;

/**
 * ============================================
 * COMMAND DEVELOPMENT GUIDE
 * ============================================
 *
 * 1. NAMING CONVENTIONS:
 *    - File: lowercase-with-dashes (e.g., ban-user.ts)
 *    - Command name: lowercase-no-spaces (e.g., "banuser")
 *    - Category: one of [utility, admin, fun, music, economy, etc.]
 *
 * 2. MODULE PLACEMENT:
 *    Security commands   → src/commands/security/
 *    Economy commands    → src/commands/economy/
 *    Music commands      → src/commands/music/
 *    Admin commands      → src/commands/admin/
 *    Fun commands        → src/commands/fun/
 *    Utility commands    → src/commands/utility/
 *
 * 3. ACCESSING DATABASE:
 *    const db = (global as any).db;
 *    const userData = await db.getUser(userId);
 *    await db.setUser(userId, userData);
 *
 * 4. PERMISSION CHECKS:
 *    if (interaction.user.id !== process.env.ASHU_ID) {
 *      return interaction.reply("❌ Owner only!");
 *    }
 *
 * 5. EMBED COLORS (Module-specific):
 *    Security    → #FF0000 (Red)
 *    Economy     → #FFD700 (Gold)
 *    Music       → #FF69B4 (Pink)
 *    Admin       → #0099FF (Blue)
 *    Fun         → #00FF00 (Green)
 *    Utility     → #9370DB (Purple)
 *
 * 6. ERROR HANDLING:
 *    Always wrap in try-catch
 *    Always send error message to user
 *    Always log errors to console
 *
 * 7. LOGGING TEMPLATE:
 *    console.log(`✅ Success message`);
 *    console.warn(`⚠️ Warning message`);
 *    console.error(`❌ Error message`);
 *
 * ============================================
 */
