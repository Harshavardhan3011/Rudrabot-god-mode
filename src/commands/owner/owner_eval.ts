import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import vm from "vm";
import { Command } from "../../types";
import permissionValidator from "../../utils/permissionValidator";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("owner-eval")
    .setDescription("Run a sandboxed JavaScript expression (owner only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option.setName("code").setDescription("JavaScript expression").setRequired(true)
    ),
  name: "owner-eval",
  description: "Evaluate secured script",
  category: "owner",
  module: "owner",
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      if (!permissionValidator.isOwner(interaction.user.id)) {
        await interaction.reply({ content: "❌ Owner only command.", ephemeral: true });
        return;
      }

      const code = interaction.options.getString("code", true);
      const sandbox = {
        Math,
        Date,
        JSON,
        Number,
        String,
        Boolean,
      } as Record<string, unknown>;

      let result: unknown;
      try {
        const script = new vm.Script(code);
        result = script.runInNewContext(sandbox, { timeout: 1000 });
      } catch (error) {
        await interaction.reply({
          content: `❌ Eval failed: ${(error as Error).message}`,
          ephemeral: true,
        });
        return;
      }

      const output = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      const safeOutput = (output || "undefined").slice(0, 1800);
      await interaction.reply({ content: `\`\`\`js\n${safeOutput}\n\`\`\``, ephemeral: true });
    } catch (error) {
      console.error("Error in /owner-eval:", error);
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ Failed to execute eval.", ephemeral: true });
      }
    }
  },
};

export default command;

