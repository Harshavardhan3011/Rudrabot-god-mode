import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { Command } from "../../types";
import {
  ANTI_NUKE_FLAG_KEYS,
  buildAntiNukeMatrix,
  getOrCreateGuildData,
  saveGuildData,
} from "../../database/guildSecurityMatrix";

type ModuleKey =
  | "ai"
  | "creator"
  | "echo"
  | "economy"
  | "expansion"
  | "futuretech"
  | "gateway"
  | "greeting"
  | "moderation"
  | "music"
  | "owner"
  | "security"
  | "tickets"
  | "utility"
  | "voice";

type ModuleMeta = {
  label: string;
  description: string;
  title: string;
  color: `#${string}`;
  emoji: string;
};

const moduleMeta: Record<ModuleKey, ModuleMeta> = {
  ai: {
    label: "1. AI Suite",
    description: "Gemini AI, chat, image generation",
    title: "🧠 AI SUITE // COGNITIVE LAYER",
    color: "#9C27B0",
    emoji: "🧠",
  },
  creator: {
    label: "2. Creator Tools",
    description: "Social sync, stats, YouTube integration",
    title: "📱 CREATOR TOOLS // SOCIAL ENGINE",
    color: "#FF6B6B",
    emoji: "📱",
  },
  echo: {
    label: "3. Echo Module",
    description: "Message echoing, mimics, reactions",
    title: "🎤 ECHO MODULE // MIRROR ENGINE",
    color: "#FF9800",
    emoji: "🎤",
  },
  economy: {
    label: "4. Economy Empire",
    description: "Banking, jobs, progression, trading",
    title: "🏦 ECONOMY EMPIRE // FINANCIAL CORE",
    color: "#1976D2",
    emoji: "🏦",
  },
  expansion: {
    label: "5. Expansion Hub",
    description: "Module docs, initialization, status",
    title: "🔧 EXPANSION HUB // INTEGRATION POINT",
    color: "#4CAF50",
    emoji: "🔧",
  },
  futuretech: {
    label: "6. FutureTech",
    description: "Image imagination, profiling, upscaling",
    title: "🚀 FUTURETECH // FUTURE ENGINE",
    color: "#00BCD4",
    emoji: "🚀",
  },
  gateway: {
    label: "7. Gateway",
    description: "Auth, autoroles, verification setup",
    title: "🚪 GATEWAY // ACCESS CONTROL",
    color: "#E91E63",
    emoji: "🚪",
  },
  greeting: {
    label: "8. Greeting",
    description: "Welcome, goodbye, invite tracking",
    title: "👋 GREETING // WELCOME ENGINE",
    color: "#00C853",
    emoji: "👋",
  },
  moderation: {
    label: "9. Moderation",
    description: "Mute, purge, warnings, discipline",
    title: "⚖️ MODERATION CORE // CONTROL GRID",
    color: "#F44336",
    emoji: "⚖️",
  },
  music: {
    label: "10. Music Engine",
    description: "Play, queue, skip, volume control",
    title: "🎵 MUSIC ENGINE // SONIC MATRIX",
    color: "#FF1744",
    emoji: "🎵",
  },
  owner: {
    label: "11. Owner Commands",
    description: "Emergency control, VIP management, backups",
    title: "👑 OWNER COMMANDS // SUPREME ACCESS",
    color: "#FFD700",
    emoji: "👑",
  },
  security: {
    label: "12. Security",
    description: "Sentinel scanning, whitelist, shield",
    title: "🛡️ SECURITY // FORTRESS LAYER",
    color: "#D32F2F",
    emoji: "🛡️",
  },
  tickets: {
    label: "13. Tickets",
    description: "Support system, claims, transcripts",
    title: "🎫 TICKETS // SUPPORT PROTOCOL",
    color: "#6A1B9A",
    emoji: "🎫",
  },
  utility: {
    label: "14. Utility & Help",
    description: "Help, ping, info commands, general tools",
    title: "🛠️ UTILITY & HELP // OPERATIONS TOOLBOX",
    color: "#2196F3",
    emoji: "🛠️",
  },
  voice: {
    label: "15. Voice Controls",
    description: "VC limits, locks, management",
    title: "🔊 VOICE CONTROLS // AUDIO CONTROL",
    color: "#FF5722",
    emoji: "🔊",
  },
};


const moduleOrder: ModuleKey[] = [
  "ai",
  "creator",
  "echo",
  "economy",
  "expansion",
  "futuretech",
  "gateway",
  "greeting",
  "moderation",
  "music",
  "owner",
  "security",
  "tickets",
  "utility",
  "voice",
];

const HELP_SHIELD_ALL_ON = "help_shield_all_on";
const HELP_SHIELD_ALL_OFF = "help_shield_all_off";
const HELP_SHIELD_REFRESH = "help_shield_refresh";

function toReadableFlagLabel(flag: string): string {
  return flag
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\bVc\b/g, "VC")
    .replace(/\bIp\b/g, "IP")
    .replace(/^./, (c) => c.toUpperCase());
}

function buildShieldControlRow(disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(HELP_SHIELD_ALL_ON)
      .setLabel("Enable All Flags")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(HELP_SHIELD_ALL_OFF)
      .setLabel("Disable All Flags")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(HELP_SHIELD_REFRESH)
      .setLabel("Refresh Status")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );
}

function buildSecurityStatusEmbed(
  guildName: string,
  guildIconUrl: string | null,
  antinukeConfig: Record<string, boolean>
): EmbedBuilder {
  const allLines = ANTI_NUKE_FLAG_KEYS.map((flag) => {
    const enabled = Boolean(antinukeConfig?.[flag]);
    const marker = enabled ? "✅ ACTIVE" : "❌ INACTIVE";
    return `**${toReadableFlagLabel(flag)}:** ${marker}`;
  });

  const midpoint = Math.ceil(allLines.length / 2);
  const firstHalf = allLines.slice(0, midpoint).join("\n");
  const secondHalf = allLines.slice(midpoint).join("\n");
  const activeCount = ANTI_NUKE_FLAG_KEYS.filter((flag) => Boolean(antinukeConfig?.[flag])).length;

  const embed = new EmbedBuilder()
    .setColor("#2B2D31")
    .setTitle(`🛡️ Security Settings For ${guildName}`)
    .setDescription(
      [
        "Tip: Move the bot role above regular roles for full antinuke enforcement.",
        `Active Flags: **${activeCount}/${ANTI_NUKE_FLAG_KEYS.length}**`,
      ].join("\n")
    )
    .addFields(
      { name: "Antinuke Matrix (1-22)", value: firstHalf || "No flags.", inline: true },
      { name: "Antinuke Matrix (23-44)", value: secondHalf || "No flags.", inline: true }
    )
    .setFooter({ text: "Powered by Ashu 👑 | Designed for Supremacy" })
    .setTimestamp();

  if (guildIconUrl) {
    embed.setThumbnail(guildIconUrl);
  }

  return embed;
}

function isModuleKey(value: string): value is ModuleKey {
  return moduleOrder.includes(value as ModuleKey);
}

function resolveModuleKey(rawValue: string): ModuleKey | null {
  const normalized = rawValue.trim().toLowerCase();
  if (isModuleKey(normalized)) return normalized;

  // Friendly aliases for users selecting "help" mentally as a module.
  if (normalized === "help" || normalized === "help-center" || normalized === "help_center") {
    return "utility";
  }

  return null;
}

function buildHomeEmbed(interaction: ChatInputCommandInteraction): EmbedBuilder {
  const totalCommands = (global as any).commandHandler?.getCommandCount?.() || "?";
  return new EmbedBuilder()
    .setColor("#00FFFF")
    .setTitle("🔱 RUDRA.0x COMMAND CENTER 🔱")
    .setThumbnail(interaction.client.user.displayAvatarURL())
    .setDescription(
      [
        "**THE COMMAND CENTER (VIRTUAL OS)**",
        `Welcome to RUDRA.0x! Explore **${totalCommands} commands** across 15 modules.`,
        "",
        "📚 **How to Use:**",
        "• Select a module from the dropdown below",
        "• View all commands in that module with descriptions",
        "• Commands marked with **/** are slash commands",
        "",
        "👑 Owner: Ashu",
        "🛠️ Developers: Ashu & Zoro",
        `⚡ Latency: ${interaction.client.ws.ping}ms`,
        "💎 Status: Advanced Premium (Active)",
      ].join("\n")
    )
    .setFooter({ text: "Powered by Ashu 👑 | Designed for Supremacy" })
    .setTimestamp();
}

function buildMenu(disabled = false): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("help_menu_select")
    .setPlaceholder("🔽 Scroll & Select a Module....")
    .setDisabled(disabled)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      moduleOrder.map((key) => ({
        label: moduleMeta[key].label,
        description: moduleMeta[key].description,
        value: key,
        emoji: moduleMeta[key].emoji,
      }))
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

function buildModuleEmbed(moduleKey: ModuleKey): EmbedBuilder {
  try {
  const meta = moduleMeta[moduleKey];
  const commandHandler = (global as any).commandHandler;
  
  if (!commandHandler) {
    return new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("⚠️ Command Handler Not Available")
      .setDescription("Unable to fetch commands at this time. Please try again later.");
  }

  // Get commands for this module
  const categoryCommands = commandHandler.getCommandsByCategory(moduleKey) || [];
  const moduleCommands = commandHandler.getCommandsByModule(moduleKey) || [];
  const commandMap = new Map<string, Command>();

  for (const cmd of [...categoryCommands, ...moduleCommands] as Command[]) {
    const key = (cmd?.name || "").toLowerCase();
    if (key) commandMap.set(key, cmd);
  }

  const commands = Array.from(commandMap.values());
  
  if (commands.length === 0) {
    return new EmbedBuilder()
      .setColor(meta.color)
      .setTitle(meta.title)
      .setDescription([
        "**No commands found in this module yet.**",
        "This usually means the module files are missing `data` exports or the loader has not indexed them yet.",
      ].join("\n"))
      .setFooter({ text: "Powered by Ashu 👑 | Designed for Supremacy" })
      .setTimestamp();
  }

  // Sort commands alphabetically by name
  const sortedCommands = (commands as Command[]).sort((a: Command, b: Command) => a.name.localeCompare(b.name));
  
  // Build command list with descriptions
  const rawCommandLines = sortedCommands.map((cmd: Command) => {
    const slashIndicator = cmd.data ? "/" : "●";
    const safeName = (cmd.name || "unknown").slice(0, 48);
    const description = (cmd.description || "No description available").replace(/\s+/g, " ").trim();
    const safeDescription = description.length > 120 ? `${description.slice(0, 117)}...` : description;
    return `\`${slashIndicator}\` **${safeName}** - ${safeDescription}`;
  });

  // Keep output under Discord embed limits (6000 chars total across all fields).
  const MAX_COMMAND_TEXT_CHARS = 4600;
  const MAX_LINE_LENGTH = 320;
  const commandLines: string[] = [];
  let usedChars = 0;
  let omittedCount = 0;

  for (const line of rawCommandLines) {
    const safeLine = line.length > MAX_LINE_LENGTH ? `${line.slice(0, MAX_LINE_LENGTH - 3)}...` : line;
    const nextLen = safeLine.length + 1;
    if (usedChars + nextLen > MAX_COMMAND_TEXT_CHARS) {
      omittedCount++;
      continue;
    }

    commandLines.push(safeLine);
    usedChars += nextLen;
  }

  // Split into fields (max 1024 chars per field, max 25 fields)
  const embed = new EmbedBuilder()
    .setColor(meta.color)
    .setTitle(meta.title)
    .setDescription(`**Total Commands:** ${commands.length}`)
    .setFooter({ text: "Powered by Ashu 👑 | Designed for Supremacy" })
    .setTimestamp();

  let currentField = "";
  let fieldCount = 0;

  const flushField = (): void => {
    if (!currentField) return;

    const value = currentField.trim();
    if (!value) {
      currentField = "";
      return;
    }

    embed.addFields({
      name: `Commands${fieldCount > 0 ? ` (Part ${fieldCount + 1})` : ""}`,
      value: value.length > 1024 ? `${value.slice(0, 1021)}...` : value,
      inline: false,
    });
    fieldCount++;
    currentField = "";
  };

  for (const line of commandLines) {
    if ((currentField + "\n" + line).length > 1024) {
      flushField();
      currentField = line;
    } else {
      currentField += "\n" + line;
    }

    // Discord embed max fields is 25; keep one slot for output-limit note.
    if (fieldCount >= 24) {
      omittedCount += Math.max(commandLines.length - (commandLines.indexOf(line) + 1), 0);
      break;
    }
  }

  // Add remaining field
  flushField();

  if (omittedCount > 0) {
    embed.addFields({
      name: "Output Limited",
      value: `Showing ${commandLines.length} commands here. ${omittedCount} more command(s) were hidden to stay within Discord embed limits.`,
      inline: false,
    });
  }

  return embed;
  } catch (error) {
    console.error("❌ buildModuleEmbed failed:", error);
    return new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("⚠️ Help Module Error")
      .setDescription("Failed to render this module due to invalid command metadata.")
      .setTimestamp();
  }
}

const helpCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View all commands organized by module with descriptions"),
  name: "help",
  description: "View all commands organized by module with descriptions",
  category: "utility",
  module: "utility",

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      await interaction.deferReply();

      const homeEmbed = buildHomeEmbed(interaction);
      const menuRow = buildMenu(false);

      await interaction.editReply({
        embeds: [homeEmbed],
        components: [menuRow],
      });

      const message = await interaction.fetchReply();

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 10 * 60 * 1000, // 10 minutes
      });

      const buttonCollector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 10 * 60 * 1000,
      });

      collector.on("collect", async (selectInteraction) => {
        if (selectInteraction.customId !== "help_menu_select") return;

        if (selectInteraction.user.id !== interaction.user.id) {
          await selectInteraction.reply({
            content: "⚠️ This help menu is not for you! Use **/help** to get your own.",
            flags: 64, // Ephemeral flag
          });
          return;
        }

        try {
          const rawSelected = (selectInteraction.values?.[0] || "").toLowerCase();
          console.log("Selected module:", rawSelected);
          console.log("Available modules:", moduleOrder.join(", "));

          const selected = resolveModuleKey(rawSelected);
          if (!selected) {
            await selectInteraction.update({
              content: `❌ Module not found: ${rawSelected}. Try selecting Utility & Help for help-related commands.`,
              embeds: [],
              components: [buildMenu(false)],
            });
            return;
          }

          if (selected === "security") {
            const guild = selectInteraction.guild;
            if (!guild) {
              await selectInteraction.update({
                content: "⚠️ Security panel can only be used inside a server.",
                embeds: [],
                components: [buildMenu(false)],
              });
              return;
            }

            const guildData = await getOrCreateGuildData(guild.id, guild.name, guild.ownerId);
            const securityEmbed = buildSecurityStatusEmbed(
              guild.name,
              guild.iconURL(),
              (guildData?.antinuke || {}) as Record<string, boolean>
            );

            await selectInteraction.update({
              content: "",
              embeds: [securityEmbed],
              components: [buildMenu(false), buildShieldControlRow(false)],
            });
            return;
          }

          const updatedEmbed = buildModuleEmbed(selected);

          await selectInteraction.update({
            embeds: [updatedEmbed],
            components: [buildMenu(false)],
          });
        } catch (error) {
          console.error("❌ Error updating help module view:", error);
          try {
            await selectInteraction.update({
              content: "⚠️ That help module could not be loaded. The bot will keep running, but this category has invalid metadata.",
              embeds: [],
              components: [buildMenu(false)],
            });
          } catch {
            // Ignore follow-up failures.
          }
        }
      });

      buttonCollector.on("collect", async (buttonInteraction) => {
        if (
          buttonInteraction.customId !== HELP_SHIELD_ALL_ON &&
          buttonInteraction.customId !== HELP_SHIELD_ALL_OFF &&
          buttonInteraction.customId !== HELP_SHIELD_REFRESH
        ) {
          return;
        }

        if (
          buttonInteraction.user.id !== interaction.user.id &&
          !buttonInteraction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
        ) {
          await buttonInteraction.reply({
            content: "⚠️ Only the command owner or a Manage Server moderator can use these controls.",
            flags: 64,
          });
          return;
        }

        if (!buttonInteraction.guild) {
          await buttonInteraction.reply({
            content: "⚠️ This control only works in a server.",
            flags: 64,
          });
          return;
        }

        try {
          await buttonInteraction.deferUpdate();

          const guild = buttonInteraction.guild;
          const guildData = await getOrCreateGuildData(guild.id, guild.name, guild.ownerId);
          guildData.modules = guildData.modules || {};
          guildData.antinuke = guildData.antinuke || {};

          if (buttonInteraction.customId === HELP_SHIELD_ALL_ON) {
            guildData.modules.antinuke = true;
            guildData.antinuke = {
              ...(guildData.antinuke || {}),
              ...buildAntiNukeMatrix(true),
            };
            await saveGuildData(guild.id, guildData);
          } else if (buttonInteraction.customId === HELP_SHIELD_ALL_OFF) {
            guildData.modules.antinuke = false;
            guildData.antinuke = {
              ...(guildData.antinuke || {}),
              ...buildAntiNukeMatrix(false),
            };
            await saveGuildData(guild.id, guildData);
          }

          const refreshed = await getOrCreateGuildData(guild.id, guild.name, guild.ownerId);
          const updatedSecurityEmbed = buildSecurityStatusEmbed(
            guild.name,
            guild.iconURL(),
            (refreshed?.antinuke || {}) as Record<string, boolean>
          );

          await buttonInteraction.message.edit({
            content: "",
            embeds: [updatedSecurityEmbed],
            components: [buildMenu(false), buildShieldControlRow(false)],
          });
        } catch (error) {
          console.error("❌ Error processing security toggle buttons:", error);
          await buttonInteraction
            .followUp({
              content: "⚠️ Failed to update antinuke matrix. Please try again.",
              flags: 64,
            })
            .catch(() => null);
        }
      });

      collector.on("end", async () => {
        try {
          await interaction.editReply({
            components: [buildMenu(true), buildShieldControlRow(true)],
          });
        } catch {
          // Ignore edit failures after collector expiration.
        }
      });

      buttonCollector.on("end", async () => {
        try {
          await interaction.editReply({
            components: [buildMenu(true), buildShieldControlRow(true)],
          });
        } catch {
          // Ignore edit failures after collector expiration.
        }
      });
    } catch (error) {
      console.error("❌ Error in help command:", error);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: "⚠️ An error occurred while loading the help menu. Please try again.",
            embeds: [],
            components: [],
          });
          return;
        }

        await interaction.reply({
          content: "⚠️ An error occurred while loading the help menu. Please try again.",
          flags: 64,
        });
      } catch {
        // Ignore if reply fails
      }
    }
  },
} satisfies Command & { data: SlashCommandBuilder };

export default helpCommand;
