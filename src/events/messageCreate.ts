// 🔱 RUDRA.0x Message Create Event - Prefix Command Handler
// Handles messages starting with + prefix for text-based commands

import { EventHandler } from "../types";
import { Message, ChannelType } from "discord.js";

const messageCreateEvent: EventHandler = {
  name: "messageCreate",
  execute: async (message: Message) => {
    // Ignore bot messages and system messages
    if (message.author.bot || message.system) return;

    // Get prefix from env or default to +
    const prefix = process.env.PREFIX || "+";

    // Check if message starts with prefix
    if (!message.content.startsWith(prefix)) return;

    // Extract command and arguments
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    // Get command from handler
    const commandHandler = (global as any).commandHandler;
    if (!commandHandler) {
      console.warn("⚠️ Command handler not available");
      return;
    }

    const command = commandHandler.getCommand(commandName);

    if (!command) {
      // Silently ignore unknown commands to avoid spam
      return;
    }

    // Permission check
    if (!commandHandler.hasPermission(message.author.id, command)) {
      await message.reply({
        content:
          "❌ You do not have permission to use this command. This action has been logged.",
      }).catch(err => console.error("Failed to send permission denied message:", err));

      console.log(
        `🚫 Permission denied for ${message.author.tag} on +${command.name}`
      );
      return;
    }

    try {
      console.log(
        `✅ Executing: +${command.name} (User: ${message.author.tag}) in #${
          message.channel.type === ChannelType.GuildText ? message.channel.name : "DM"
        }`
      );

      // Create a pseudo-interaction object for command compatibility
      const pseudoInteraction = {
        user: message.author,
        member: message.member,
        guild: message.guild,
        channel: message.channel,
        reply: async (options: any) => {
          // Convert interaction-style reply to message reply
          if (typeof options === "string") {
            return await message.reply(options);
          }
          return await message.reply(options);
        },
        editReply: async (options: any) => {
          // Find and edit the last bot message in thread
          if (message.reference && message.reference.messageId) {
            try {
              const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
              return await repliedTo.edit(options);
            } catch (error) {
              return await message.reply(options);
            }
          }
          return await message.reply(options);
        },
        deferReply: async () => {
          // No-op for prefix commands
          return null;
        },
        fetchReply: async () => {
          // Return the message being replied to
          const messages = await message.channel.messages.fetch({ limit: 1 });
          return messages.first() || message;
        },
        isCommand: () => true,
      };

      await command.execute(pseudoInteraction as any);
    } catch (error) {
      console.error(
        `❌ Error executing prefix command ${command.name}:`,
        error
      );

      await message.reply({
        content: "❌ There was an error executing this command.",
      }).catch(err => console.error("Failed to send error message:", err));
    }
  },
};

export default messageCreateEvent;
