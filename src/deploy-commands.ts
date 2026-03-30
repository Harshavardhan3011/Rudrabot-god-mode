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
      !entry.name.endsWith(".d.ts");

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
  const candidate: SlashCommandLike = (imported.default ?? imported) as SlashCommandLike;

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

  for (const filePath of commandFiles) {
    const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    try {
      const json = await loadSlashData(filePath);
      if (!json) {
        console.log(`⏭️  Skipped (no data.toJSON): ${relative}`);
        continue;
      }

      const cmdName = (json.name as string) || "unknown";
      
      // Route most security commands to guild-only (DEV_GUILD_ID).
      // Sentinel commands are routed to global so guild payload stays under Discord bulk limits.
      const isSecurity = relative.includes("/security/");
      const isSentinel = relative.includes("/security/sentinel-");

      if (isSecurity && !isSentinel) {
        guildPayload.push(json);
        console.log(`✅ Prepared (GUILD): /${cmdName} from ${relative}`);
      } else {
        globalPayload.push(json);
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
    await rest.put(
      Routes.applicationGuildCommands(clientId, devGuildId),
      { body: guildPayload }
    );
    console.log(`✅ Guild slash command deployment complete (${guildPayload.length} commands).`);
  } else if (guildPayload.length > 0) {
    console.warn("⚠️ Guild commands exist but DEV_GUILD_ID not set. Set DEV_GUILD_ID to deploy security commands.");
  }

  console.log("🕒 Note: Command propagation can take up to 1 hour.\n");
}

deployCommands().catch((error) => {
  console.error("💥 Deployment failed:", error);
  process.exit(1);
});
