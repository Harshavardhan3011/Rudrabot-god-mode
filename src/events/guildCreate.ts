import { AuditLogEvent, EmbedBuilder, Guild } from "discord.js";
import { EventHandler } from "../types";
import { getOrCreateGuildData, saveGuildData } from "../database/guildSecurityMatrix";

const guildCreateEvent: EventHandler = {
  name: "guildCreate",
  async execute(guild: Guild): Promise<void> {
    try {
      const guildData = await getOrCreateGuildData(guild.id, guild.name, guild.ownerId);

      let inviterId: string | null = null;
      try {
        const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 5 });
        const entry = logs.entries.find((item) => item.target?.id === guild.client.user?.id);
        inviterId = entry?.executorId || null;
      } catch {
        inviterId = null;
      }

      const controllerId = inviterId || guild.ownerId;

      (guildData as any).inviterId = controllerId;

      if (!Array.isArray((guildData as any).vipMembers)) {
        (guildData as any).vipMembers = [];
      }
      if (!(guildData as any).vipMembers.includes(controllerId)) {
        (guildData as any).vipMembers.push(controllerId);
      }

      if (!Array.isArray((guildData as any).whitelist)) {
        (guildData as any).whitelist = [];
      }
      const alreadyWhitelisted = (guildData as any).whitelist.some((entry: any) => entry?.userId === controllerId);
      if (!alreadyWhitelisted) {
        (guildData as any).whitelist.push({
          userId: controllerId,
          username: "inviter",
          bypasses: ["all"],
          reason: "Auto-added as inviter controller",
          addedAt: new Date().toISOString(),
        });
      }

      await saveGuildData(guild.id, guildData);

      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("RUDRA.0X Security Controller Set")
        .setDescription(
          [
            `Controller: <@${controllerId}>`,
            "Security commands are restricted to inviter, VIP, and bot owners.",
          ].join("\n")
        )
        .setFooter({ text: "Auto-configured on guild join" })
        .setTimestamp();

      await guild.systemChannel?.send({ embeds: [embed] }).catch(() => null);
    } catch (error) {
      console.error("Failed to initialize guild security controller:", error);
    }
  },
};

export default guildCreateEvent;
