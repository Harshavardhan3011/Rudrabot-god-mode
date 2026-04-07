import "dotenv/config";
import fs from "fs";
import path from "path";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

type SlashCommandLike = {
  data?: {
    toJSON: () => Record<string, unknown>;
  };
};

function clampText(value: unknown, maxLength: number, fallback = ""): string {
  const str = (typeof value === "string" ? value : fallback).trim();
  if (!str) return fallback;
  return str.length > maxLength ? str.slice(0, maxLength) : str;
}

function sanitizeCommandPayload(payload: Record<string, unknown>): Record<string, unknown> | null {
  const name = clampText(payload.name, 32);
  const description = clampText(payload.description, 100, "No description");
  if (!name) return null;

  const clone = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  clone.name = name;
  clone.description = description;

  const sanitizeOptions = (options: any[]): any[] => {
    return options.map((option) => {
      const next = { ...option };
      if (typeof next.name === "string") next.name = clampText(next.name, 32, next.name);
      if (typeof next.description === "string") next.description = clampText(next.description, 100, "No description");

      if (Array.isArray(next.choices)) {
        next.choices = next.choices.map((choice: any) => ({
          ...choice,
          name: clampText(choice?.name, 100, "choice"),
        }));
      }

      if (Array.isArray(next.options)) {
        next.options = sanitizeOptions(next.options);
      }

      return next;
    });
  };

  if (Array.isArray(clone.options)) {
    clone.options = sanitizeOptions(clone.options);
  }

  return clone;
}

function getCommandFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getCommandFiles(fullPath));
      continue;
    }

    const isCommandFile =
      (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) &&
      !entry.name.endsWith(".d.ts") &&
      !entry.name.includes("generator");

    if (isCommandFile) files.push(fullPath);
  }

  return files;
}

async function loadSlashData(filePath: string): Promise<Record<string, unknown> | null> {
  const resolvedPath = path.resolve(filePath);
  // Ensure latest source is loaded if running deploy repeatedly.
  delete require.cache[require.resolve(resolvedPath)];
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const imported = require(resolvedPath);
  const candidate: any = (imported.default ?? imported) as any;

  if (candidate?.data && typeof candidate.data.toJSON === "function") {
    return candidate.data.toJSON();
  }

  if (!candidate?.data || typeof candidate.data.toJSON !== "function") {
    return null;
  }

  return candidate.data.toJSON();
}

async function deployCommands(): Promise<void> {
  const token = process.env.BOT_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const devGuildId = process.env.DEV_GUILD_ID;

  if (!token || !clientId) {
    throw new Error("Missing BOT_TOKEN or CLIENT_ID in environment variables.");
  }

  const commandsRoot = path.join(__dirname, "commands");
  const commandFiles = getCommandFiles(commandsRoot);

  console.log("\n🚀 RUDRA.0x Slash Deployment Started");
  console.log(`📂 Scanning command files in: ${commandsRoot}`);
  console.log(`🧩 Files discovered: ${commandFiles.length}`);

  const globalPayload: Record<string, unknown>[] = [];
  const guildPayload: Record<string, unknown>[] = [];
  const seenNames = new Set<string>();
  const GLOBAL_COMMAND_LIMIT = 100;
  const GUILD_COMMAND_LIMIT = 100;
  const protectedGlobalCommandNames = new Set(["help", "ping", "server-info"]);

  const isShieldOrAntinukeCritical = (name: string): boolean => {
    const normalized = String(name || "").toLowerCase();
    if (!normalized) return false;

    if (
      normalized === "security" ||
      normalized === "shield-status" ||
      normalized === "whitelist-add" ||
      normalized === "whitelist-remove" ||
      normalized === "whitelist-view" ||
      normalized === "whitelist-role" ||
      normalized === "whitelist-clear-all"
    ) {
      return true;
    }

    return (
      normalized.startsWith("shield-")
    );
  };

  const guildPriority = (name: string): number => {
    if (name === "security") return 100;
    if (name === "alliance") return 99;
    if (name.startsWith("alliance-")) return 90;
    if (name.startsWith("security-logs")) return 85;
    if (name.startsWith("shield-")) return 70;
    if (name.startsWith("trust-score-")) return 65;
    if (name.startsWith("whitelist-")) return 60;
    if (name.startsWith("audit-")) return 55;
    if (name.startsWith("punishment-")) return 50;
    if (name.startsWith("recovery-")) return 45;
    if (name.startsWith("threat-intel-")) return 40;
    if (name.startsWith("sentinel-")) return 35;
    return 1;
  };

  for (const filePath of commandFiles) {
    const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    try {
      const json = await loadSlashData(filePath);
      if (!json) {
        console.log(`⏭️  Skipped (no data.toJSON): ${relative}`);
        continue;
      }

      const sanitized = sanitizeCommandPayload(json);
      if (!sanitized) {
        console.warn(`⚠️ Skipped invalid slash payload: ${relative}`);
        continue;
      }

      const cmdName = (sanitized.name as string) || "unknown";
      if (seenNames.has(cmdName)) {
        console.warn(`⚠️ Skipping duplicate command name during deploy: /${cmdName} (${relative})`);
        continue;
      }
      seenNames.add(cmdName);
      
      // Route most security commands to guild-only (DEV_GUILD_ID).
      // Sentinel commands are routed to global so guild payload stays under Discord bulk limits.
      const isSecurity = relative.includes("/security/");
      const isSentinel = relative.includes("/security/sentinel-");

      if (isSecurity && !isSentinel) {
        guildPayload.push(sanitized);
        console.log(`✅ Prepared (GUILD): /${cmdName} from ${relative}`);
      } else {
        globalPayload.push(sanitized);
        console.log(`✅ Prepared (GLOBAL): /${cmdName} from ${relative}`);
      }
    } catch (error) {
      console.error(`❌ Failed loading ${relative}:`, error);
    }
  }

  if (globalPayload.length === 0 && guildPayload.length === 0) {
    console.warn("⚠️ No valid slash commands found to deploy.");
    return;
  }

  if (globalPayload.length > GLOBAL_COMMAND_LIMIT) {
    // Keep protected commands in global payload even when trimming.
    const pinnedGlobal = globalPayload.filter((cmd) =>
      protectedGlobalCommandNames.has(String(cmd.name || "").toLowerCase())
    );
    const nonPinnedGlobal = globalPayload.filter(
      (cmd) => !protectedGlobalCommandNames.has(String(cmd.name || "").toLowerCase())
    );

    const keepNonPinnedCount = Math.max(GLOBAL_COMMAND_LIMIT - pinnedGlobal.length, 0);
    const keptNonPinned = nonPinnedGlobal.slice(0, keepNonPinnedCount);
    const overflow = nonPinnedGlobal.slice(keepNonPinnedCount);

    globalPayload.length = 0;
    globalPayload.push(...pinnedGlobal, ...keptNonPinned);

    if (devGuildId) {
      guildPayload.push(...overflow);
      console.warn(
        `⚠️ Global payload exceeded ${GLOBAL_COMMAND_LIMIT}. Moved ${overflow.length} command(s) to guild deployment.`
      );
    } else {
      console.warn(
        `⚠️ Global payload exceeded ${GLOBAL_COMMAND_LIMIT}. Dropping ${overflow.length} command(s) without DEV_GUILD_ID.`
      );
    }
  }

  if (guildPayload.length > GUILD_COMMAND_LIMIT) {
    guildPayload.sort((a, b) => {
      const aName = String(a.name || "");
      const bName = String(b.name || "");
      const p = guildPriority(bName) - guildPriority(aName);
      return p !== 0 ? p : aName.localeCompare(bName);
    });

    // Avoid dropping protected commands from guild payload as a safety net.
    const pinnedGuild = guildPayload.filter((cmd) =>
      isShieldOrAntinukeCritical(String(cmd.name || "")) ||
      protectedGlobalCommandNames.has(String(cmd.name || "").toLowerCase())
    );
    const nonPinnedGuild = guildPayload.filter(
      (cmd) =>
        !isShieldOrAntinukeCritical(String(cmd.name || "")) &&
        !protectedGlobalCommandNames.has(String(cmd.name || "").toLowerCase())
    );
    const keepNonPinnedCount = Math.max(GUILD_COMMAND_LIMIT - pinnedGuild.length, 0);
    const keptNonPinned = nonPinnedGuild.slice(0, keepNonPinnedCount);
    const dropped = nonPinnedGuild.slice(keepNonPinnedCount);

    guildPayload.length = 0;
    guildPayload.push(...pinnedGuild, ...keptNonPinned);

    console.warn(
      `⚠️ Guild payload exceeded ${GUILD_COMMAND_LIMIT}. Dropped ${dropped.length} low-priority command(s) to satisfy Discord limits.`
    );
  }

  const rest = new REST({ version: "10" }).setToken(token);

  // Deploy global commands
  if (globalPayload.length > 0) {
    console.log(`\n📡 Registering ${globalPayload.length} GLOBAL slash commands...`);
    await rest.put(Routes.applicationCommands(clientId), { body: globalPayload });
    console.log(`✅ Global slash command deployment complete (${globalPayload.length} commands).`);
  }

  // Deploy guild commands to DEV_GUILD_ID
  if (guildPayload.length > 0 && devGuildId) {
    console.log(`\n📡 Registering ${guildPayload.length} GUILD slash commands to ${devGuildId}...`);
    try {
      await rest.put(
        Routes.applicationGuildCommands(clientId, devGuildId),
        { body: guildPayload }
      );
      console.log(`✅ Guild slash command deployment complete (${guildPayload.length} commands).`);
    } catch (error: any) {
      if (error?.code === 50001) {
        console.warn(`⚠️ Guild command deployment skipped for ${devGuildId}: Missing Access`);
      } else {
        throw error;
      }
    }
  } else if (guildPayload.length > 0) {
    console.warn("⚠️ Guild commands exist but DEV_GUILD_ID not set. Set DEV_GUILD_ID to deploy security commands.");
  }

  console.log("🕒 Note: Command propagation can take up to 1 hour.\n");
}

deployCommands().catch((error) => {
  console.error("💥 Deployment failed:", error);
  process.exit(1);
});
