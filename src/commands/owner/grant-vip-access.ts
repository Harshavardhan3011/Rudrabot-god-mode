import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import vipHandler, { VIPDurationChoice, VIPTier } from '../../database/vipHandler';
import { AccessLevel, checkAccess } from '../../utils/accessControl';

const DURATION_CHOICES: VIPDurationChoice[] = [
  '1hr',
  '12hr',
  '24hr',
  '3days',
  '7days',
  '14days',
  '30days',
  '6months',
  '1yr',
  'Lifetime',
];

export const data = new SlashCommandBuilder()
  .setName('grant-vip-access')
  .setDescription('Grant VIP or VIP_PRTR access with fixed duration choices')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption(opt =>
    opt.setName('user').setDescription('User to grant access').setRequired(true)
  )
  .addStringOption(opt => {
    let builder = opt
      .setName('tier')
      .setDescription('VIP tier to grant')
      .setRequired(true)
      .addChoices(
        { name: 'VIP', value: 'VIP' },
        { name: 'VIP_PRTR', value: 'VIP_PRTR' }
      );
    return builder;
  })
  .addStringOption(opt => {
    let builder = opt
      .setName('duration')
      .setDescription('Access duration')
      .setRequired(true);

    for (const choice of DURATION_CHOICES) {
      builder = builder.addChoices({ name: choice, value: choice });
    }

    return builder;
  });

export const name = 'grant-vip-access';
export const description = 'Grant VIP access';
export const category = 'owner';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!checkAccess(interaction.user.id, AccessLevel.OWNER)) {
    await interaction.reply({
      content: 'Access denied. Only OWNER can grant VIP access.',
      ephemeral: true,
    });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);
  const tier = interaction.options.getString('tier', true) as VIPTier;
  const duration = interaction.options.getString('duration', true) as VIPDurationChoice;

  if (targetUser.bot) {
    await interaction.reply({ content: 'Bots cannot receive VIP access.', ephemeral: true });
    return;
  }

  if (targetUser.id === interaction.user.id) {
    await interaction.reply({ content: 'Self-grant is blocked.', ephemeral: true });
    return;
  }

  const record = vipHandler.grant(targetUser.id, duration, interaction.user.id, tier);

  const expiresText = record.expiresAt === null
    ? 'Lifetime'
    : new Date(record.expiresAt).toLocaleString();

  const embed = new EmbedBuilder()
    .setColor('#22C55E')
    .setTitle('VIP Access Granted')
    .addFields(
      { name: 'User', value: `<@${targetUser.id}> (${targetUser.id})`, inline: false },
      { name: 'Tier', value: tier, inline: true },
      { name: 'Duration', value: duration, inline: true },
      { name: 'Expires At', value: expiresText, inline: false }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
