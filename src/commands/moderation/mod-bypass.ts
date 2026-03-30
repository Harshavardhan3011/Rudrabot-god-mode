/**
 * MODERATION MATRIX GROUPED COMMAND: /mod-bypass
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('mod-bypass')
  .setDescription('Automod bypass controls.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add user to automod bypass.')
      .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove user from automod bypass.')
      .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List users with automod bypass.')
  );

export const name = 'mod-bypass';
export const description = 'Automod bypass controls.';
export const category = 'moderation';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const sub = interaction.options.getSubcommand();
    const embed = new EmbedBuilder()
      .setColor('#F97316')
      .setTitle('Moderation Matrix: /mod-bypass')
      .setDescription('Executed subcommand: ' + sub)
      .addFields({ name: 'Route', value: '/mod-bypass ' + sub, inline: false })
      .setFooter({ text: 'RUDRA.0x Moderation & Punishment Matrix' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error executing mod-bypass command:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Error executing command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Error executing command.', ephemeral: true });
    }
  }
}
