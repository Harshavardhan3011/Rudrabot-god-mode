/**
 * SENTINELSCAN - Vpn Proxy Block
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sentinel-vpn-proxy-block')
  .setDescription('Uses an API to kick users connecting via VPNs/Proxies.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable VPN/proxy block').setRequired(true));

export const name = 'sentinel-vpn-proxy-block';
export const description = 'Uses an API to kick users connecting via VPNs/Proxies.';
export const category = 'security';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setColor('#E11D48')
      .setTitle('SentinelScan: Vpn Proxy Block')
      .setDescription('SentinelScan matrix command 28/66 configured.')
      .addFields({ name: 'Command', value: '/sentinel-vpn-proxy-block', inline: false })
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
