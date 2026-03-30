import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { Command } from "../../types";

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
    label: "14. Utility",
    description: "Ping, info commands, general tools",
    title: "🛠️ UTILITY // OPERATIONS TOOLBOX",
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
  const meta = moduleMeta[moduleKey];
  const commandHandler = (global as any).commandHandler;
  
  if (!commandHandler) {
    return new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("⚠️ Command Handler Not Available")
      .setDescription("Unable to fetch commands at this time. Please try again later.");
  }

  // Get commands for this module
  const commands = commandHandler.getCommandsByCategory(moduleKey) || [];
  
  if (commands.length === 0) {
    return new EmbedBuilder()
      .setColor(meta.color)
      .setTitle(meta.title)
      .setDescription("**No commands found in this module yet.**")
      .setFooter({ text: "Powered by Ashu 👑 | Designed for Supremacy" })
      .setTimestamp();
  }

  // Sort commands alphabetically by name
  const sortedCommands = (commands as Command[]).sort((a: Command, b: Command) => a.name.localeCompare(b.name));
  
  // Build command list with descriptions
  const commandLines = sortedCommands.map((cmd: Command) => {
    const slashIndicator = cmd.data ? "/" : "●";
    const description = cmd.description || "No description available";
    return `\`${slashIndicator}\` **${cmd.name}** - ${description}`;
  });

  // Split into fields (max 1024 chars per field, max 25 fields)
  const embed = new EmbedBuilder()
    .setColor(meta.color)
    .setTitle(meta.title)
    .setDescription(`**Total Commands:** ${commands.length}`)
    .setFooter({ text: "Powered by Ashu 👑 | Designed for Supremacy" })
    .setTimestamp();

  let currentField = "";
  let fieldCount = 0;

  for (const line of commandLines) {
    if ((currentField + "\n" + line).length > 1024) {
      if (currentField) {
        embed.addFields({
          name: `Commands (Part ${fieldCount + 1})`,
          value: currentField.trim(),
          inline: false,
        });
        fieldCount++;
        currentField = line;
      }
    } else {
      currentField += "\n" + line;
    }
  }

  // Add remaining field
  if (currentField) {
    embed.addFields({
      name: `Commands${fieldCount > 0 ? ` (Part ${fieldCount + 1})` : ""}`,
      value: currentField.trim(),
      inline: false,
    });
  }

  return embed;
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
      const homeEmbed = buildHomeEmbed(interaction);
      const menuRow = buildMenu(false);

      await interaction.reply({
        embeds: [homeEmbed],
        components: [menuRow],
      });

      const message = await interaction.fetchReply();

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 10 * 60 * 1000, // 10 minutes
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

        const selected = selectInteraction.values[0] as ModuleKey;
        const updatedEmbed = buildModuleEmbed(selected);

        await selectInteraction.update({
          embeds: [updatedEmbed],
          components: [buildMenu(false)],
        });
      });

      collector.on("end", async () => {
        try {
          await interaction.editReply({
            components: [buildMenu(true)],
          });
        } catch {
          // Ignore edit failures after collector expiration.
        }
      });
    } catch (error) {
      console.error("❌ Error in help command:", error);
      try {
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
