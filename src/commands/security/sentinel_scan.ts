import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types";
import { getOrCreateGuildData } from "../../database/guildSecurityMatrix";

const command: Command = {
  name: "sentinel-scan",
  description: "Run sentinel quick scan",
  category: "security",
  module: "security",
  data: new SlashCommandBuilder()
    .setName("sentinel-scan")
    .setDescription("Run a quick security scan for the current server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    const guild = interaction.guild;
    const guildData = await getOrCreateGuildData(guild.id, guild.name, guild.ownerId);
    const adminRoles = guild.roles.cache.filter((role) => role.permissions.has(PermissionFlagsBits.Administrator));
    const botCount = guild.members.cache.filter((member) => member.user.bot).size;
    const humanCount = Math.max(guild.memberCount - botCount, 0);
    const enabledShieldFlags = Object.entries(guildData.antinuke).filter(([, value]) => Boolean(value)).map(([key]) => key);
    const enabledModules = Object.entries(guildData.modules).filter(([, value]) => Boolean(value)).map(([key]) => key);

    const findings: string[] = [];
    if (!guildData.modules.antinuke) findings.push("Antinuke module is disabled.");
    if (enabledShieldFlags.length === 0) findings.push("No antinuke flags are enabled.");
    if (guildData.whitelist.length === 0) findings.push("Whitelist is empty.");
    if (guildData.channels.security && !guild.channels.cache.has(guildData.channels.security)) {
      findings.push("Configured security channel no longer exists.");
    }
    if (adminRoles.size === 0) findings.push("No administrator roles detected.");

    const embed = new EmbedBuilder()
      .setColor(findings.length ? "#F59E0B" : "#22C55E")
      .setTitle("🛡️ Sentinel Quick Scan")
      .setDescription(findings.length ? "Security review completed with findings." : "No obvious security issues detected in the current configuration.")
      .addFields(
        { name: "Server", value: `${guild.name}`, inline: true },
        { name: "Members", value: `${guild.memberCount} total / ${humanCount} humans / ${botCount} bots`, inline: true },
        { name: "Modules Enabled", value: enabledModules.length ? enabledModules.join(", ") : "None", inline: false },
        { name: "Antinuke Flags", value: enabledShieldFlags.length ? enabledShieldFlags.join(", ") : "None", inline: false },
        { name: "Whitelisted Users", value: `${guildData.whitelist.length}`, inline: true },
        { name: "Admin Roles", value: `${adminRoles.size}`, inline: true },
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    if (findings.length) {
      embed.addFields({ name: "Findings", value: findings.map((item) => `• ${item}`).join("\n"), inline: false });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;

