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
        "⚠️ Commands directory not found. Creating commands structure..."
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
        .filter((f) => (f.endsWith(".ts") || f.endsWith(".js")) && !f.includes("generator"));

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
              module,
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

          if (this.commands.has(commandName)) {
            console.warn(`⚠️ Skipping duplicate runtime command: ${commandName} from ${module}/${file}`);
            continue;
          }

          this.commands.set(commandName, command);
          if (command.data?.toJSON) {
            this.commandsArray.push(command.data.toJSON());
          }

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

      const clampText = (value: unknown, maxLength: number, fallback = ""): string => {
        const str = (typeof value === "string" ? value : fallback).trim();
        if (!str) return fallback;
        return str.length > maxLength ? str.slice(0, maxLength) : str;
      };

      const sanitizePayload = (payload: any): any => {
        const clone = JSON.parse(JSON.stringify(payload));
        clone.name = clampText(clone.name, 32, clone.name || "command");
        clone.description = clampText(clone.description, 100, "No description");

        const sanitizeOptions = (options: any[]): any[] =>
          options.map((option) => {
            const next = { ...option };
            if (typeof next.name === "string") next.name = clampText(next.name, 32, next.name);
            if (typeof next.description === "string") next.description = clampText(next.description, 100, "No description");
            if (Array.isArray(next.options)) next.options = sanitizeOptions(next.options);
            if (Array.isArray(next.choices)) {
              next.choices = next.choices.map((choice: any) => ({
                ...choice,
                name: clampText(choice?.name, 100, "choice"),
                ...(typeof choice?.value === "string"
                  ? { value: clampText(choice.value, 100, choice.value) }
                  : {}),
              }));
            }
            return next;
          });

        if (Array.isArray(clone.options)) {
          clone.options = sanitizeOptions(clone.options);
        }

        return clone;
      };

      const uniquePayloadMap = new Map<string, any>();
      for (const payload of this.commandsArray) {
        const sanitized = sanitizePayload(payload);
        const name = sanitized?.name as string | undefined;
        if (!name) continue;
        if (uniquePayloadMap.has(name)) {
          console.warn(`⚠️ Duplicate slash command name detected during registration: ${name} (keeping latest)`);
        }
        uniquePayloadMap.set(name, sanitized);
      }
      const payload = Array.from(uniquePayloadMap.values());

      console.log("🔄 Registering slash commands with Discord...");

      const configuredGuildIds = (process.env.DEV_GUILD_ID || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      const guildIds = configuredGuildIds.length
        ? configuredGuildIds
        : this.client.guilds.cache.map((g) => g.id);

      let guildRegisteredCount = 0;
      for (const guildId of guildIds) {
        try {
          await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID || "", guildId),
            { body: payload }
          );
          guildRegisteredCount++;
          console.log(`✅ Registered ${payload.length} slash commands to guild ${guildId}`);
        } catch (error: any) {
          if (error?.code === 50001) {
            console.warn(`⚠️ Missing Access for guild ${guildId}; skipping guild registration.`);
          } else {
            throw error;
          }
        }
      }

      if (guildRegisteredCount === 0) {
        // Global commands can take time to propagate.
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID || ""), {
          body: payload,
        });

        console.log(
          `✅ Registered ${payload.length} global slash commands (propagation may take up to 1 hour)`
        );
      }
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
    const lookup = category.toLowerCase();
    return Array.from(
      this.commands.filter((cmd) => {
        const cmdCategory = (cmd.category || cmd.module || "").toLowerCase();
        return cmdCategory === lookup;
      }).values()
    );
  }

  /**
   * Get commands by module
   */
  getCommandsByModule(module: string): Command[] {
    const lookup = module.toLowerCase();
    return Array.from(
      this.commands.filter((cmd) => {
        const cmdModule = (cmd.module || cmd.category || "").toLowerCase();
        return cmdModule === lookup;
      }).values()
    );
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
