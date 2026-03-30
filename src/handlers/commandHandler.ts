// 🔱 RUDRA.0x Command Handler
// Loads all commands from modular structure (15 modules)

import { Client, Collection, REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import { Command } from "../types";

class CommandHandler {
  private client: Client;
  private commands: Collection<string, Command>;
  private commandsArray: any[] = [];

  constructor(client: Client) {
    this.client = client;
    this.commands = new Collection();
  }

  /**
   * Load all commands from the src/commands directory structure
   * Expected structure:
   * src/commands/
   *   ├── module1/
   *   │   ├── command1.ts
   *   │   └── command2.ts
   *   ├── module2/
   *   └── ...
   */
  async loadCommands(): Promise<void> {
    this.commands.clear();
    this.commandsArray = [];

    const commandsPath = path.join(process.cwd(), "src/commands");

    if (!fs.existsSync(commandsPath)) {
      console.warn(
        "⚠️ Commands directory not found. Creating placeholder structure..."
      );
      fs.mkdirSync(commandsPath, { recursive: true });
      return;
    }

    const modules = fs.readdirSync(commandsPath);

    for (const module of modules) {
      const modulePath = path.join(commandsPath, module);

      // Skip if not a directory
      if (!fs.statSync(modulePath).isDirectory()) continue;

      console.log(`📦 Loading module: ${module}`);

      const files = fs
        .readdirSync(modulePath)
        .filter((f) => f.endsWith(".ts") || f.endsWith(".js"));

      for (const file of files) {
        try {
          const filePath = path.join(modulePath, file);
          // Using require for ts-node compatibility
          const moduleExport = require(filePath).default || require(filePath);
          
          // Support both old-style (command.name) and new-style (data.SlashCommandBuilder) commands
          let command: Command;
          let commandName: string;
          let commandDesc: string;
          
          if (moduleExport.data && moduleExport.execute) {
            // New style: SlashCommandBuilder + execute function
            const slashData = moduleExport.data;
            commandName = slashData.name;
            commandDesc = slashData.description;
            command = {
              name: commandName,
              description: commandDesc,
              category: module,
              execute: moduleExport.execute,
              data: slashData
            };
          } else if (moduleExport.name) {
            // Old style: direct command object
            command = moduleExport;
            commandName = command.name;
            commandDesc = command.description;
            
            // Ensure category is set for old-style commands
            if (!command.category) {
              command.category = module;
            }
            if (!command.module) {
              command.module = module;
            }
          } else {
            console.warn(`⚠️ Skipping ${file} - missing command structure (data+execute or name)`);
            continue;
          }

          if (!commandName) {
            console.warn(`⚠️ Skipping ${file} - missing command name`);
            continue;
          }

          this.commands.set(commandName, command);
          this.commandsArray.push({
            name: commandName,
            description: commandDesc,
          });

          console.log(`  ✅ Loaded: ${commandName} (${module})`);
        } catch (error) {
          console.error(`❌ Error loading command ${file}:`, error);
        }
      }
    }

    console.log(`\n📊 Total commands loaded: ${this.commands.size}`);
  }

  /**
   * Register slash commands with Discord
   */
  async registerSlashCommands(): Promise<void> {
    try {
      if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID) {
        console.warn("⚠️ BOT_TOKEN or CLIENT_ID missing. Skipping slash command registration.");
        return;
      }

      const rest = new REST({ version: "10" }).setToken(
        process.env.BOT_TOKEN || ""
      );

      console.log("🔄 Registering slash commands with Discord...");

      const devGuildId = process.env.DEV_GUILD_ID;
      if (devGuildId) {
        await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID || "", devGuildId),
          {
            body: this.commandsArray,
          }
        );

        console.log(
          `✅ Registered ${this.commandsArray.length} slash commands to DEV_GUILD_ID=${devGuildId}`
        );
        return;
      }

      // Global commands can take time to propagate.
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID || ""), {
        body: this.commandsArray,
      });

      console.log(
        `✅ Registered ${this.commandsArray.length} global slash commands (propagation may take up to 1 hour)`
      );
    } catch (error) {
      console.error("❌ Failed to register slash commands:", error);
    }
  }

  /**
   * Get a command by name
   */
  getCommand(name: string): Command | undefined {
    return this.commands.get(name.toLowerCase());
  }

  /**
   * Get all commands
   */
  getAllCommands(): Collection<string, Command> {
    return this.commands;
  }

  /**
   * Get command count
   */
  getCommandCount(): number {
    return this.commands.size;
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: string): Command[] {
    return Array.from(this.commands.filter((cmd) => cmd.category === category).values());
  }

  /**
   * Get commands by module
   */
  getCommandsByModule(module: string): Command[] {
    return Array.from(this.commands.filter((cmd) => cmd.module === module).values());
  }

  /**
   * Check if user has permission to use command
   */
  hasPermission(userId: string, command: Command): boolean {
    const ashuId = process.env.ASHU_ID;
    const zoroId = process.env.ZORO_ID;

    // Owner commands
    if (command.ownerOnly && userId !== ashuId && userId !== zoroId) {
      return false;
    }

    return true;
  }
}

export default CommandHandler;
