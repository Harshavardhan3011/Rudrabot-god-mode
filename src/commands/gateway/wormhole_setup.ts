import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { Command } from "../../types";
import runtimeConfigStore from "../../database/runtimeConfigStore";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("wormhole-setup")
    .setDescription("Configure cross-server wormhole webhook bridge for this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel used for wormhole sync")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("enabled")
        .setDescription("Enable or disable wormhole for this guild")
        .setRequired(false)
    ),
  name: "wormhole-setup",
  description: "Setup wormhole sync",
  category: "gateway",
  module: "gateway",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
        return;
      }

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageWebhooks)) {
        await interaction.reply({ content: "❌ You need Manage Webhooks permission.", ephemeral: true });
        return;
      }

      const channelValue = interaction.options.getChannel("channel", true);
      const enabled = interaction.options.getBoolean("enabled") ?? true;

      if (!(channelValue instanceof TextChannel)) {
        await interaction.reply({ content: "❌ Wormhole requires a text channel.", ephemeral: true });
        return;
      }

      const channel = channelValue;

      const config = runtimeConfigStore.getGatewayConfig(interaction.guild.id);

      if (!enabled) {
        config.wormholeChannelId = undefined;
        config.wormholeWebhookUrl = undefined;
        runtimeConfigStore.setGatewayConfig(interaction.guild.id, config);
        await interaction.reply({ content: "✅ Wormhole sync disabled for this guild.", ephemeral: true });
        return;
      }

      const webhook = await channel.createWebhook({
        name: "RUDRA Wormhole",
        reason: `Configured by ${interaction.user.tag}`,
      });

      config.wormholeChannelId = channel.id;
      config.wormholeWebhookUrl = webhook.url;
      runtimeConfigStore.setGatewayConfig(interaction.guild.id, config);

      await interaction.reply({
        content: `✅ Wormhole configured for <#${channel.id}> and webhook bridge is active.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error in /wormhole-setup:", error);
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ Failed to setup wormhole.", ephemeral: true });
      }
    }
  },
};

export default command;

