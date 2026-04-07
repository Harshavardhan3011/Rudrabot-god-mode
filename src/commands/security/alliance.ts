import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

const allianceFlow = [
  "/alliance-create",
  "/alliance-invite",
  "/alliance-accept or /alliance-reject",
  "/alliance-sync-config",
  "/alliance-sync-bans",
  "/alliance-view-network",
];

function toList(commands: any[]): string {
  if (!commands.length) return "No alliance commands found.";
  return commands
    .map((cmd) => `• **/${cmd.name}** - ${cmd.description || "No description"}`)
    .join("\n")
    .slice(0, 1800);
}

export const data = new SlashCommandBuilder()
  .setName("alliance")
  .setDescription("Single command center for alliance and common network actions")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) => sub.setName("list").setDescription("List all alliance commands"))
  .addSubcommand((sub) =>
    sub
      .setName("open")
      .setDescription("Open one alliance command quickly")
      .addStringOption((opt) =>
        opt
          .setName("command")
          .setDescription("Alliance command name (without /)")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("common").setDescription("Show common alliance workflow and emergency actions")
  );

export const name = "alliance";
export const description = "Single command center for alliance and common network actions";
export const category = "security";

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const commandHandler = (global as any).commandHandler;
    const moduleCommands = commandHandler?.getCommandsByCategory?.("security") || [];

    const allianceCommands = moduleCommands
      .filter((cmd: any) => typeof cmd?.name === "string" && cmd.name.startsWith("alliance-"))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    const sub = interaction.options.getSubcommand();

    if (sub === "open") {
      const requested = interaction.options
        .getString("command", true)
        .trim()
        .replace(/^\//, "")
        .toLowerCase();

      const target = allianceCommands.find((cmd: any) => cmd.name.toLowerCase() === requested);

      if (!target) {
        await interaction.reply({
          content: `Alliance command not found: /${requested}. Use /alliance list to see available commands.`,
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Alliance Router")
        .setDescription(`Use **/${target.name}** to execute this alliance action.`)
        .addFields(
          { name: "Command", value: `/${target.name}`, inline: true },
          { name: "Description", value: target.description || "No description", inline: false }
        )
        .setFooter({ text: "RUDRA.0x Alliance Hub" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "common") {
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Alliance Common Workflow")
        .setDescription("Use this quick flow for normal and emergency alliance operations.")
        .addFields(
          { name: "Standard Setup Flow", value: allianceFlow.join("\n"), inline: false },
          {
            name: "Emergency Actions",
            value: ["/alliance-global-alert", "/alliance-emergency-sever", "/alliance-remove"].join("\n"),
            inline: false,
          },
          {
            name: "Tip",
            value: "Use /security list group:alliance to see the same commands from the main security hub.",
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x Alliance Common Panel" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("Alliance Command Center")
      .setDescription(`Total alliance commands: **${allianceCommands.length}**`)
      .addFields({ name: "Commands", value: toList(allianceCommands), inline: false })
      .setFooter({ text: "RUDRA.0x Alliance Network" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error("Error executing alliance command:", error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "Error executing command.", ephemeral: true });
    } else {
      await interaction.reply({ content: "Error executing command.", ephemeral: true });
    }
  }
}
