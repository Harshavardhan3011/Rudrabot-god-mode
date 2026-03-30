/**
 * MODERATION MATRIX GROUPED COMMAND: /mod
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('mod')
  .setDescription('Manual moderation and punishment controls.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommandGroup(group => group
    .setName('core')
    .setDescription('Core moderation actions')
    .addSubcommand(sub => sub.setName('ban').setDescription('Ban a user.').addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)))
    .addSubcommand(sub => sub.setName('unban').setDescription('Unban a user by user ID.').addStringOption(opt => opt.setName('user-id').setDescription('User ID to unban').setRequired(true)))
    .addSubcommand(sub => sub.setName('kick').setDescription('Kick a user.').addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)))
    .addSubcommand(sub => sub.setName('timeout').setDescription('Timeout a user.').addUserOption(opt => opt.setName('user').setDescription('User to timeout').setRequired(true)).addStringOption(opt => opt.setName('duration').setDescription('Duration').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)))
    .addSubcommand(sub => sub.setName('untimeout').setDescription('Remove timeout from a user.').addUserOption(opt => opt.setName('user').setDescription('User to untimeout').setRequired(true)))
    .addSubcommand(sub => sub.setName('warn').setDescription('Warn a user.').addUserOption(opt => opt.setName('user').setDescription('User to warn').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove-warn').setDescription('Remove warning from a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)).addIntegerOption(opt => opt.setName('warn-id').setDescription('Warn ID').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('warnings').setDescription('View warnings of a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('clear-warnings').setDescription('Clear all warnings of a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('strike').setDescription('Add strike to a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove-strike').setDescription('Remove strike from a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('view-strikes').setDescription('View strikes of a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('softban').setDescription('Softban a user.').addUserOption(opt => opt.setName('user').setDescription('User to softban').setRequired(true)))
    .addSubcommand(sub => sub.setName('mass-ban').setDescription('Ban multiple users.').addStringOption(opt => opt.setName('user-ids').setDescription('Comma-separated user IDs').setRequired(true)))
    .addSubcommand(sub => sub.setName('mass-kick').setDescription('Kick multiple users.').addStringOption(opt => opt.setName('user-ids').setDescription('Comma-separated user IDs').setRequired(true)))
    .addSubcommand(sub => sub.setName('mass-timeout').setDescription('Timeout multiple users.').addStringOption(opt => opt.setName('duration').setDescription('Duration').setRequired(true)).addStringOption(opt => opt.setName('user-ids').setDescription('Comma-separated user IDs').setRequired(true)))
  )
  .addSubcommandGroup(group => group
    .setName('purge')
    .setDescription('Message cleanup actions')
    .addSubcommand(sub => sub.setName('all').setDescription('Delete messages.').addIntegerOption(opt => opt.setName('amount').setDescription('Message count').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('user').setDescription('Delete messages from a specific user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)).addIntegerOption(opt => opt.setName('amount').setDescription('Message count').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('links').setDescription('Delete recent messages containing links.').addIntegerOption(opt => opt.setName('amount').setDescription('How many messages to scan').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('bots').setDescription('Delete recent bot messages.').addIntegerOption(opt => opt.setName('amount').setDescription('How many messages to scan').setRequired(true).setMinValue(1)))
  )
  .addSubcommandGroup(group => group
    .setName('channel')
    .setDescription('Text channel controls')
    .addSubcommand(sub => sub.setName('lock').setDescription('Lock a channel.').addChannelOption(opt => opt.setName('channel').setDescription('Channel to lock').setRequired(true)))
    .addSubcommand(sub => sub.setName('unlock').setDescription('Unlock a channel.').addChannelOption(opt => opt.setName('channel').setDescription('Channel to unlock').setRequired(true)))
    .addSubcommand(sub => sub.setName('lockdown-all').setDescription('Lock all text channels.'))
    .addSubcommand(sub => sub.setName('unlock-all').setDescription('Unlock all text channels.'))
    .addSubcommand(sub => sub.setName('slowmode').setDescription('Set channel slowmode.').addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(true)).addStringOption(opt => opt.setName('duration').setDescription('Slowmode duration').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove-slowmode').setDescription('Remove channel slowmode.').addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(true)))
    .addSubcommand(sub => sub.setName('hide').setDescription('Hide a channel.').addChannelOption(opt => opt.setName('channel').setDescription('Channel to hide').setRequired(true)))
    .addSubcommand(sub => sub.setName('unhide').setDescription('Unhide a channel.').addChannelOption(opt => opt.setName('channel').setDescription('Channel to unhide').setRequired(true)))
  )
  .addSubcommandGroup(group => group
    .setName('voice')
    .setDescription('Voice moderation controls')
    .addSubcommand(sub => sub.setName('mute').setDescription('Voice mute a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('unmute').setDescription('Voice unmute a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('deafen').setDescription('Voice deafen a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('undeafen').setDescription('Voice undeafen a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('disconnect').setDescription('Disconnect user from voice channel.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('lock').setDescription('Lock your current voice channel.'))
    .addSubcommand(sub => sub.setName('unlock').setDescription('Unlock your current voice channel.'))
  )
  .addSubcommandGroup(group => group
    .setName('note')
    .setDescription('Private moderator notes')
    .addSubcommand(sub => sub.setName('add').setDescription('Attach a private note to a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)).addStringOption(opt => opt.setName('note').setDescription('Note text').setRequired(true)))
    .addSubcommand(sub => sub.setName('view').setDescription('View private notes of a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove a private note from a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)).addIntegerOption(opt => opt.setName('note-id').setDescription('Note ID').setRequired(true).setMinValue(1)))
  )
  .addSubcommandGroup(group => group
    .setName('intel')
    .setDescription('User and server intelligence tools')
    .addSubcommand(sub => sub.setName('user-info').setDescription('Show complete user profile.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('server-info').setDescription('Show server information.'))
    .addSubcommand(sub => sub.setName('avatar-history').setDescription('Fetch previous avatars of a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('nickname-history').setDescription('Fetch previous nicknames of a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('force-nickname').setDescription('Force change nickname of a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)).addStringOption(opt => opt.setName('name').setDescription('New nickname').setRequired(true)))
    .addSubcommand(sub => sub.setName('reset-nickname').setDescription('Reset nickname of a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(sub => sub.setName('snipe').setDescription('Retrieve last deleted message.'))
    .addSubcommand(sub => sub.setName('edit-snipe').setDescription('Retrieve original text of last edited message.'))
    .addSubcommand(sub => sub.setName('report-card').setDescription('Generate moderation report card for a user.').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
  );

export const name = 'mod';
export const description = 'Manual moderation and punishment controls.';
export const category = 'moderation';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const route = group ? '/mod ' + group + ' ' + sub : '/mod ' + sub;

    const embed = new EmbedBuilder()
      .setColor('#F97316')
      .setTitle('Moderation Matrix: /mod')
      .setDescription('Executed route: ' + route)
      .addFields({ name: 'Route', value: route, inline: false })
      .setFooter({ text: 'RUDRA.0x Moderation & Punishment Matrix' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error executing mod command:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Error executing command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Error executing command.', ephemeral: true });
    }
  }
}
