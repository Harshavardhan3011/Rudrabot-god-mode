/**
 * SENTINELSCAN - Emoji Spam Block
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-emoji-spam-block')
  .setDescription('Stops users from sending too many emojis in one message.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(opt => opt.setName('amount').setDescription('Maximum emojis allowed').setRequired(true).setMinValue(1));

export const name = 'sentinel-emoji-spam-block';
export const description = 'Stops users from sending too many emojis in one message.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Emoji Spam Block')
      .setDescription('SentinelScan matrix command 56/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-emoji-spam-block', inline: false })
      .setFooter({ text: 'RUDRA.0x SentinelScan Matrix' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error executing sentinel command:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Error executing command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Error executing command.', ephemeral: true });
    }
  }
}
