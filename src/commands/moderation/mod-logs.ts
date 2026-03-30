/**
 * MODERATION MATRIX GROUPED COMMAND: /mod-logs
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('mod-logs')
  .setDescription('Moderation log routing controls.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand(sub => sub
      .setName('set')
      .setDescription('Set moderation logs channel.')
      .addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('disable')
      .setDescription('Disable moderation logs.')
  );

export const name = 'mod-logs';
export const description = 'Moderation log routing controls.';
export const category = 'moderation';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const sub = interaction.options.getSubcommand();
    const embed = new EmbedBuilder()
      .setColor('#F97316')
      .setTitle('Moderation Matrix: /mod-logs')
      .setDescription('Executed subcommand: ' + sub)
      .addFields({ name: 'Route', value: '/mod-logs ' + sub, inline: false })
      .setFooter({ text: 'RUDRA.0x Moderation & Punishment Matrix' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error executing mod-logs command:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Error executing command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Error executing command.', ephemeral: true });
    }
  }
}
