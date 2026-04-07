import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

type SecurityGroup =
  | "all"
  | "sentinel"
  | "shield"
  | "alliance"
  | "whitelist"
  | "trust"
  | "audit"
  | "punishment"
  | "recovery"
  | "quarantine"
  | "logs"
  | "threat"
  | "common";

const groupMatchers: Record<Exclude<SecurityGroup, "all">, RegExp[]> = {
  sentinel: [/^sentinel-/],
  shield: [/^shield-/],
  alliance: [/^alliance-/],
  whitelist: [/^whitelist-/],
  trust: [/^trust-score-/],
  audit: [/^audit-/],
  punishment: [/^punishment-/],
  recovery: [/^recovery-/],
  quarantine: [/quarantine/],
  logs: [/security-logs/, /logs/],
  threat: [/^threat-intel-/],
  common: [/status/, /view/, /list/, /scan/],
};

function formatCommandLine(commandName: string, commandDescription: string): string {
  return `• **/${commandName}** - ${commandDescription || "No description"}`;
}

function chunkLines(lines: string[], maxLength = 900): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    if ((current + "\n" + line).trim().length > maxLength) {
      if (current.trim()) chunks.push(current.trim());
      current = line;
    } else {
      current += `\n${line}`;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function belongsToGroup(commandName: string, group: Exclude<SecurityGroup, "all">): boolean {
  return groupMatchers[group].some((matcher) => matcher.test(commandName));
}

export const data = new SlashCommandBuilder()
  .setName("security")
  .setDescription("Unified security command hub for all protection systems")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("List all security commands by category")
      .addStringOption((opt) =>
        opt
          .setName("group")
          .setDescription("Filter to one security group")
          .setRequired(false)
          .addChoices(
            { name: "All", value: "all" },
            { name: "Sentinel", value: "sentinel" },
            { name: "Shield", value: "shield" },
            { name: "Alliance", value: "alliance" },
            { name: "Whitelist", value: "whitelist" },
            { name: "Trust", value: "trust" },
            { name: "Audit", value: "audit" },
            { name: "Punishment", value: "punishment" },
            { name: "Recovery", value: "recovery" },
            { name: "Quarantine", value: "quarantine" },
            { name: "Logs", value: "logs" },
            { name: "Threat Intel", value: "threat" },
            { name: "Common", value: "common" }
          )
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("open")
      .setDescription("Find one security command quickly")
      .addStringOption((opt) =>
        opt
          .setName("command")
          .setDescription("Security command name (without /)")
          .setRequired(true)
      )
  );

export const name = "security";
export const description = "Unified security command hub for all protection systems";
export const category = "security";

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const commandHandler = (global as any).commandHandler;
    const moduleCommands = commandHandler?.getCommandsByCategory?.("security") || [];

    const securityCommands = moduleCommands
      .filter((cmd: any) => typeof cmd?.name === "string")
      .filter((cmd: any) => cmd.name !== "security" && cmd.name !== "alliance")
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    if (securityCommands.length === 0) {
      await interaction.reply({
        content: "No security commands are loaded right now.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "open") {
      const requested = (interaction.options.getString("command", true) || "")
        .trim()
        .replace(/^\//, "")
        .toLowerCase();

      const target = securityCommands.find((cmd: any) => cmd.name.toLowerCase() === requested);

      if (!target) {
        await interaction.reply({
          content: `Command not found: /${requested}. Use /security list to see all security commands.`,
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor("#D32F2F")
        .setTitle("Security Command Router")
        .setDescription(`Use **/${target.name}** to execute this action.`)
        .addFields(
          { name: "Command", value: `/${target.name}`, inline: true },
          { name: "Description", value: target.description || "No description", inline: false },
          {
            name: "Tip",
            value:
              "This hub centralizes security commands in one place. Run the routed command directly to perform the action.",
            inline: false,
          }
        )
        .setFooter({ text: "RUDRA.0x Security Hub" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const selectedGroup =
      (interaction.options.getString("group", false) as SecurityGroup | null) || "all";

    const filtered =
      selectedGroup === "all"
        ? securityCommands
        : securityCommands.filter((cmd: any) =>
            belongsToGroup(cmd.name, selectedGroup as Exclude<SecurityGroup, "all">)
          );

    if (filtered.length === 0) {
      await interaction.reply({
        content: `No commands found for group: ${selectedGroup}.`,
        ephemeral: true,
      });
      return;
    }

    const lines = filtered.map((cmd: any) => formatCommandLine(cmd.name, cmd.description));
    const chunks = chunkLines(lines);

    const embed = new EmbedBuilder()
      .setColor("#D32F2F")
      .setTitle("Security Command Hub")
      .setDescription(
        `Showing **${filtered.length}** command(s) from **${selectedGroup}**. Use /security open command:<name> for quick routing.`
      )
      .setFooter({ text: "RUDRA.0x Unified Security Control" })
      .setTimestamp();

    chunks.slice(0, 4).forEach((chunk, index) => {
      embed.addFields({
        name: `Commands${chunks.length > 1 ? ` (Part ${index + 1})` : ""}`,
        value: chunk,
        inline: false,
      });
    });

    if (chunks.length > 4) {
      embed.addFields({
        name: "Output Limited",
        value: `Showing first ${Math.min(filtered.length, lines.length)} commands due to embed limits. Narrow with group filter for full list.`,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error("Error executing security command:", error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "Error executing command.", ephemeral: true });
    } else {
      await interaction.reply({ content: "Error executing command.", ephemeral: true });
    }
  }
}
