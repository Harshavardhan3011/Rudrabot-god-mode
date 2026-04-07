// 🔱 RUDRA.0x - MAIN ENTRY POINT
// The Supreme Digital Entity - Discord Bot

import { Client, GatewayIntentBits, Collection, ActivityType } from "discord.js";
import dotenv from "dotenv";
import chalk from "chalk";
import CommandHandler from "./handlers/commandHandler";
import EventHandlerClass from "./handlers/eventHandler";
import DatabaseHandler from "./database/dbHandler";
import StatusRotator from "./utils/statusRotator";

// Load environment variables
dotenv.config();

// ============================================
// 🔱 BOT INITIALIZATION
// ============================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ============================================
// 🛠️ CORE HANDLERS & UTILITIES
// ============================================

// Initialize command handler
const commandHandler = new CommandHandler(client);

// Initialize event handler
const eventHandler = new EventHandlerClass(client);

// Initialize database
const dbPath = process.env.DATABASE_PATH || "./src/database/rudra_main.sqlite";
const db = new DatabaseHandler(dbPath);

// Initialize status rotator
const statusRotator = new StatusRotator(
  client,
  process.env.ASHU_ID || "",
  process.env.ZORO_ID || ""
);

// Store in client for access throughout bot
declare global {
  namespace NodeJS {
    interface Global {
      db: DatabaseHandler;
      commandHandler: CommandHandler;
    }
  }
}

(global as any).db = db;
(global as any).commandHandler = commandHandler;

// ============================================
// 📋 READY EVENT (Bot Startup)
// ============================================

client.once("ready", async () => {
  console.log(
    chalk.cyan.bold(
      `\n╔═══════════════════════════════════════════════════════════╗`
    )
  );
  console.log(
    chalk.cyan.bold(
      `║                    🔱 RUDRA.0x ONLINE 🔱                  ║`
    )
  );
  console.log(
    chalk.cyan.bold(
      `║         Beyond Limitations. Beyond Boundaries.           ║`
    )
  );
  console.log(
    chalk.cyan.bold(
      `╚═══════════════════════════════════════════════════════════╝\n`
    )
  );

  console.log(chalk.yellow("⚙️  SYSTEM INITIALIZATION:"));
  console.log(chalk.gray(`   📌 Bot Name: ${client.user?.username}`));
  console.log(chalk.gray(`   🆔 Client ID: ${client.user?.id}`));
  console.log(chalk.gray(`   🌍 Servers: ${client.guilds.cache.size}`));
  console.log(chalk.gray(`   👥 Total Users: ${client.users.cache.size}`));
  console.log(chalk.gray(`   📦 Database Type: SQLITE`));

  console.log(chalk.yellow("\n📂 HANDLERS LOADED:"));
  console.log(chalk.gray(`   ✅ Command Handler: ${commandHandler.getCommandCount()} commands`));
  console.log(chalk.gray(`   ✅ Event Handler: ${eventHandler.getEventCount()} events`));
  console.log(chalk.gray(`   ✅ Database Handler: SQLITE (Ready)`));

  // Start status rotator
  statusRotator.start(parseInt(process.env.VC_STATUS_INTERVAL || "600000"));

  console.log(chalk.yellow("\n🚀 SYSTEMS ONLINE:"));
  console.log(chalk.green(`   ✅ Status Rotator (24/7)`));
  console.log(chalk.green(`   ✅ Antinuke Shield`));
  console.log(chalk.green(`   ✅ Sentinel-Scan (Ready)`));
  console.log(chalk.green(`   ✅ Moderation Engine`));
  console.log(chalk.green(`   ✅ Economy System`));

  console.log(chalk.cyan.bold("\n🛡️  CORE DIRECTIVES:"));
  console.log(chalk.white(`   👑 Owner: Ashu | ${process.env.ASHU_ID}`));
  console.log(chalk.white(`   ⚔️  Developer: Zoro | ${process.env.ZORO_ID}`));
  console.log(chalk.white(`   🔐 Strict Mode: ENABLED`));
  console.log(chalk.white(`   📡 Network: ANNA•CHELLI•AKKA`));

  // Set initial status
  const initialStatus = "Ruling the Discord Matrix, One Command at a Time.";
  client.user?.setActivity(initialStatus, { type: ActivityType.Playing });

  console.log(chalk.cyan.bold("\n🌟 RUDRA.0x is SUPREMACY ONLINE! 🌟\n"));

  const shouldRegisterCommands = process.env.REGISTER_COMMANDS === "true";
  if (shouldRegisterCommands) {
    console.log(chalk.blue("📋 Syncing slash commands to guild(s)..."));
    await commandHandler.registerSlashCommands();
  }
});

// ============================================
// 🔄 INTERACTION CREATE (Commands & Buttons)
// ============================================

client.on("interactionCreate", async (interaction) => {
  console.log(chalk.gray(`📩 Interaction received: ${interaction.type} | ${interaction.id}`));

  // Slash Command Handling
  if (interaction.isChatInputCommand()) {
    const command = commandHandler.getCommand(interaction.commandName);

    if (!command) {
      console.warn(
        chalk.yellow(`⚠️  Unknown command: ${interaction.commandName}`)
      );
      return;
    }

    // Permission check
    if (!commandHandler.hasPermission(interaction.user.id, command)) {
      await interaction.reply({
        content:
          "❌ You do not have permission to use this command. This action has been logged.",
        ephemeral: true,
      });
      console.log(
        chalk.red(
          `🚫 Permission denied for ${interaction.user.tag} on /${command.name}`
        )
      );
      return;
    }

    try {
      console.log(
        chalk.green(
          `✅ Executing: /${command.name} (User: ${interaction.user.tag})`
        )
      );
      await command.execute(interaction);
    } catch (error) {
      console.error(
        chalk.red(`❌ Error executing command ${command.name}:`),
        error
      );
      if (interaction.deferred || interaction.replied) {
        await interaction
          .followUp({
            content: "❌ There was an error executing this command.",
            ephemeral: true,
          })
          .catch(() => null);
      } else {
        await interaction
          .reply({
            content: "❌ There was an error executing this command.",
            ephemeral: true,
          })
          .catch(() => null);
      }
    }
  }

  // Button Interactions (Pagination, etc.)
  if (interaction.isButton()) {
    const customId = interaction.customId;

    console.log(
      chalk.blue(`🔘 Button pressed: ${customId} (User: ${interaction.user.tag})`)
    );

    // Page navigation for help menu
    if (customId === "page_1" || customId === "page_2" || customId === "page_3") {
      // This would be handled by a separate button handler
      // For now, just acknowledge
      await interaction.deferUpdate();
    }
  }

  // Select menu interactions are handled by per-message collectors (e.g. help command).
  if (interaction.isStringSelectMenu()) {
    console.log(chalk.blue(`🧭 Select menu interaction: ${interaction.customId}`));
  }
});

// ============================================
// 🔴 ERROR HANDLING
// ============================================

process.on("unhandledRejection", (reason, promise) => {
  console.error(chalk.red("❌ Unhandled Rejection at:"), promise);
  console.error(chalk.red("   Reason:"), reason);
});

process.on("uncaughtException", (error) => {
  console.error(chalk.red("❌ Uncaught Exception:"), error);
  console.error(chalk.red("   The bot might crash. Consider restarting."));
});

// ============================================
// 📦 ASYNC INITIALIZATION & LOGIN
// ============================================

async function initialize() {
  try {
    console.log(chalk.yellow("🔄 Loading commands..."));
    await commandHandler.loadCommands();

    console.log(chalk.yellow("🔄 Loading events..."));
    await eventHandler.loadEvents();

    console.log(
      chalk.gray(
        "ℹ️ Slash command sync runs after ready event (set REGISTER_COMMANDS=false to disable)."
      )
    );

    console.log(chalk.yellow("\n🚀 Logging in to Discord..."));
    await client.login(process.env.BOT_TOKEN);
  } catch (error) {
    console.error(chalk.red("❌ Fatal error during initialization:"), error);
    process.exit(1);
  }
}

// Start the bot
initialize();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log(chalk.yellow("\n🛑 Shutdown signal received..."));
  db.close();
  statusRotator.stop();
  client.destroy();
  console.log(chalk.green("✅ Bot shutdown complete."));
  process.exit(0);
});

export { client, commandHandler, eventHandler, db, statusRotator };
