/**
 * MODERATION MATRIX GROUPED COMMAND: /automod
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('mod-automod')
  .setDescription('Automated moderation escalation engine.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand(sub => sub
      .setName('18plus-filter')
      .setDescription('Activates the Telugu and English profanity/18+ scanner.')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable 18+ filter').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('escalation-18plus')
      .setDescription('Sets the first offense punishment duration.')
      .addStringOption(opt => opt.setName('1st-timeout-duration').setDescription('First offense timeout duration').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('escalation-18plus-ban')
      .setDescription('Toggles the 2nd-time direct ban rule for 18+ content.')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable direct ban on second offense').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('set-warning-dm')
      .setDescription('Customizes the warning DM sent on first offense.')
      .addStringOption(opt => opt.setName('message').setDescription('Warning DM message').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('link-filter')
      .setDescription('Activates the link restriction engine.')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable link filter').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('escalation-link-timeout')
      .setDescription('Sets instant timeout duration for posting a link.')
      .addStringOption(opt => opt.setName('duration').setDescription('Timeout duration').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('escalation-link-kick')
      .setDescription('Sets link strike count that triggers auto-kick.')
      .addIntegerOption(opt => opt.setName('strike-count').setDescription('Strike count').setRequired(true).setMinValue(1))
  )
  .addSubcommand(sub => sub
      .setName('image-nsfw-scan')
      .setDescription('Scans images and GIFs for 18+ content.')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable NSFW image scanner').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('custom-badword-add')
      .setDescription('Adds a custom bad word to blocklist.')
      .addStringOption(opt => opt.setName('word').setDescription('Word to add').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('custom-badword-remove')
      .setDescription('Removes a custom bad word from blocklist.')
      .addStringOption(opt => opt.setName('word').setDescription('Word to remove').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('badword-list')
      .setDescription('DMs the list of blocked words.')
  )
  .addSubcommand(sub => sub
      .setName('whitelist-link')
      .setDescription('Allows a safe link domain.')
      .addStringOption(opt => opt.setName('domain').setDescription('Domain to whitelist').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('blacklist-link')
      .setDescription('Blocks a specific domain.')
      .addStringOption(opt => opt.setName('domain').setDescription('Domain to blacklist').setRequired(true))
  )
  .addSubcommand(sub => sub
      .setName('spam-filter')
      .setDescription('Auto-mutes users typing too fast.')
      .addIntegerOption(opt => opt.setName('messages-per-sec').setDescription('Allowed messages per second').setRequired(true).setMinValue(1))
  )
  .addSubcommand(sub => sub
      .setName('zalgo-filter')
      .setDescription('Auto-deletes corrupted text.')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable zalgo filter').setRequired(true))
  );

export const name = 'mod-automod';
export const description = 'Automated moderation escalation engine.';
export const category = 'moderation';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const sub = interaction.options.getSubcommand();
    const embed = new EmbedBuilder()
      .setColor('#F97316')
    .setTitle('Moderation Matrix: /mod-automod')
      .setDescription('Executed subcommand: ' + sub)
    .addFields({ name: 'Route', value: '/mod-automod ' + sub, inline: false })
      .setFooter({ text: 'RUDRA.0x Moderation & Punishment Matrix' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error executing automod command:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Error executing command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Error executing command.', ephemeral: true });
    }
  }
}
