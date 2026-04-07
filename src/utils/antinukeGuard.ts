import {
  AuditLogEvent,
  BaseChannel,
  GuildEmoji,
  Guild,
  GuildBan,
  GuildMember,
  GuildBasedChannel,
  Role,
  Sticker,
  Message,
  PermissionFlagsBits,
  TextChannel,
  ThreadChannel,
  VoiceState,
} from 'discord.js';
import { AuditLogger } from '../database/auditLogger';
import { getOrCreateGuildData, saveGuildData } from '../database/guildSecurityMatrix';

const auditLogger = AuditLogger.getInstance();

const messageBuckets = new Map<string, number[]>();

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<]+/i;
const INVITE_REGEX = /(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)/i;
const ZALGO_REGEX = /[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C7\u0610-\u061A]/;

const FLAG_ALIASES: Record<string, string[]> = {
  antiBan: ['antiBan', 'anti-ban', 'antiDan'],
  antiKick: ['antiKick', 'anti-kick'],
  antiBotAdd: ['antiBotAdd', 'antiBot', 'anti-bot-add'],
  antiAltJoin: ['antiAltJoin', 'anti-alt-join'],
  antiMassMention: ['antiMassMention', 'anti-mass-mention'],
  antiSpam: ['antiSpam', 'anti-spam'],
  antiLink: ['antiLink', 'anti-link'],
  antiInvite: ['antiInvite', 'anti-invite'],
  antiZalgo: ['antiZalgo', 'anti-zalgo'],
  antiCaps: ['antiCaps', 'anti-caps'],
  antiChannelCreate: ['antiChannelCreate', 'anti-channel-create'],
  antiChannelDelete: ['antiChannelDelete', 'anti-channel-delete'],
  antiChannelUpdate: ['antiChannelUpdate', 'anti-channel-update'],
  antiThreadCreate: ['antiThreadCreate', 'anti-thread-create'],
  antiThreadDelete: ['antiThreadDelete', 'anti-thread-delete'],
  antiWebhookCreate: ['antiWebhookCreate', 'anti-webhook-create'],
  antiWebhookDelete: ['antiWebhookDelete', 'anti-webhook-delete'],
  antiWebhookUpdate: ['antiWebhookUpdate', 'anti-webhook-update'],
  antiPins: ['antiPins', 'anti-pins'],
  antiVcJoin: ['antiVcJoin', 'anti-vc-join'],
  antiRoleCreate: ['antiRoleCreate', 'anti-role-create'],
  antiRoleDelete: ['antiRoleDelete', 'anti-role-delete'],
  antiRoleUpdate: ['antiRoleUpdate', 'anti-role-update'],
  antiPermsUpdate: ['antiPermsUpdate', 'anti-perms-update'],
  antiIntegrationAdd: ['antiIntegrationAdd', 'anti-integration-add'],
  antiEmojiCreate: ['antiEmojiCreate', 'anti-emoji-create'],
  antiEmojiDelete: ['antiEmojiDelete', 'anti-emoji-delete'],
  antiStickerCreate: ['antiStickerCreate', 'anti-sticker-create'],
  antiStickerDelete: ['antiStickerDelete', 'anti-sticker-delete'],
  antiVanitySteal: ['antiVanitySteal', 'anti-vanity-steal'],
  antiServerUpdate: ['antiServerUpdate', 'anti-server-update'],
  antiPrune: ['antiPrune', 'anti-prune'],
  antiWidgetUpdate: ['antiWidgetUpdate', 'anti-widget-update'],
  antiCommunityUpdate: ['antiCommunityUpdate', 'anti-community-update'],
  antiDiscoveryUpdate: ['antiDiscoveryUpdate', 'anti-discovery-update'],
  strictMode: ['strictMode', 'strict-mode'],
  panicLockdown: ['panicLockdown', 'panic-lockdown'],
};

function normalize(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isPrivilegedMember(member: GuildMember | null | undefined): boolean {
  return Boolean(
    member?.permissions.has(PermissionFlagsBits.Administrator) ||
      member?.permissions.has(PermissionFlagsBits.ManageMessages)
  );
}

function isWhitelistedForFlag(guildData: any, userId: string, flagKey?: string): boolean {
  if (!userId) {
    return false;
  }

  const entry = Array.isArray(guildData?.whitelist)
    ? guildData.whitelist.find((item: any) => item?.userId === userId)
    : null;

  if (!entry) {
    return false;
  }

  const bypasses = Array.isArray(entry.bypasses) ? entry.bypasses : [];
  if (bypasses.length === 0 || bypasses.some((bypass: string) => normalize(bypass) === 'all')) {
    return true;
  }

  if (!flagKey) {
    return true;
  }

  const aliases = FLAG_ALIASES[flagKey] || [flagKey];
  const normalizedAliases = new Set(aliases.map((alias) => normalize(alias)));
  return bypasses.some((bypass: string) => normalizedAliases.has(normalize(bypass)));
}

async function getRecentAuditExecutorId(guild: Guild, type: AuditLogEvent): Promise<string | null> {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 1 });
    const entry = logs.entries.first();
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.createdTimestamp > 15000) {
      return null;
    }

    return entry.executorId ?? null;
  } catch {
    return null;
  }
}

async function punishExecutor(guild: Guild, executorId: string | null, reason: string): Promise<void> {
  if (!executorId || executorId === guild.ownerId) {
    return;
  }

  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.BanMembers)) {
    return;
  }

  await guild.members.ban(executorId, { reason }).catch(() => null);
}

async function deleteGuildChannel(channel: GuildBasedChannel | ThreadChannel, reason: string): Promise<void> {
  await (channel as any).delete(reason).catch(() => null);
}

async function deleteRole(role: Role, reason: string): Promise<void> {
  await role.delete(reason).catch(() => null);
}

async function updateChannelLock(channel: TextChannel | ThreadChannel, locked: boolean, reason: string): Promise<void> {
  if ('permissionOverwrites' in channel && channel.guild) {
    await channel.permissionOverwrites
      .edit(channel.guild.roles.everyone, {
        SendMessages: locked ? false : null,
        AddReactions: locked ? false : null,
        CreatePublicThreads: locked ? false : null,
        CreatePrivateThreads: locked ? false : null,
      }, { reason })
      .catch(() => null);
  }
}

async function timeoutMember(member: GuildMember, durationMs: number, reason: string): Promise<void> {
  if (!member.moderatable) {
    return;
  }

  await member.timeout(durationMs, reason).catch(() => null);
}

function hasAntinukeEnabled(guildData: any): boolean {
  return Boolean(guildData?.modules?.antinuke) || Object.values(guildData?.antinuke || {}).some(Boolean);
}

async function persistFlag(guildId: string, guildData: any): Promise<void> {
  guildData.modules = guildData.modules || {};
  guildData.modules.antinuke = hasAntinukeEnabled(guildData);
  await saveGuildData(guildId, guildData);
}

export async function setShieldFlag(
  guildId: string,
  guildName: string,
  ownerId: string,
  flagKey: string,
  enabled: boolean
): Promise<any> {
  const guildData = await getOrCreateGuildData(guildId, guildName, ownerId);

  guildData.antinuke = guildData.antinuke || {};
  guildData.antinuke[flagKey] = enabled;

  if (flagKey === 'antiBotAdd') {
    guildData.antibot = {
      enabled,
      strictMode: enabled,
      updatedBy: ownerId,
      updatedAt: Date.now(),
    };
  }

  await persistFlag(guildId, guildData);
  return guildData;
}

export function getAntinukeFlag(guildData: any, flagKey: string): boolean {
  return Boolean(guildData?.antinuke?.[flagKey]);
}

export async function handleShieldMessage(message: Message): Promise<boolean> {
  if (!message.guild || message.author.bot || !message.member) {
    return false;
  }

  const prefix = process.env.PREFIX || '+';
  if (message.content.startsWith(prefix)) {
    return false;
  }

  const guildData = await getOrCreateGuildData(message.guild.id, message.guild.name, message.guild.ownerId);
  if (!hasAntinukeEnabled(guildData)) {
    return false;
  }

  if (isPrivilegedMember(message.member) || isWhitelistedForFlag(guildData, message.author.id)) {
    return false;
  }

  const strictMode = Boolean(guildData.antinuke?.strictMode);
  const content = message.content || '';
  const lowerContent = content.toLowerCase();
  const mentionCount = (content.match(/<@&?\d+>/g) || []).length;
  const letters = content.replace(/[^a-z]/gi, '');
  const capsRatio = letters.length > 0 ? letters.replace(/[^A-Z]/g, '').length / letters.length : 0;

  if (getAntinukeFlag(guildData, 'antiMassMention')) {
    const limit = strictMode ? 3 : 5;
    if (mentionCount > limit) {
      await message.delete().catch(() => null);
      await timeoutMember(message.member, strictMode ? 30 * 60 * 1000 : 10 * 60 * 1000, 'Mass mention protection').catch(() => null);
      auditLogger.log({
        action: 'anti-mass-mention',
        executorId: message.author.id,
        guildId: message.guild.id,
        guildName: message.guild.name,
        details: { mentionCount, limit },
        success: true,
      });
      return true;
    }
  }

  if (getAntinukeFlag(guildData, 'antiInvite')) {
    if (INVITE_REGEX.test(content)) {
      await message.delete().catch(() => null);
      await timeoutMember(message.member, strictMode ? 30 * 60 * 1000 : 10 * 60 * 1000, 'Invite link protection');
      auditLogger.log({
        action: 'anti-invite',
        executorId: message.author.id,
        guildId: message.guild.id,
        guildName: message.guild.name,
        details: { content: lowerContent.slice(0, 200) },
        success: true,
      });
      return true;
    }
  }

  if (getAntinukeFlag(guildData, 'antiLink')) {
    if (URL_REGEX.test(content)) {
      await message.delete().catch(() => null);
      await timeoutMember(message.member, strictMode ? 30 * 60 * 1000 : 10 * 60 * 1000, 'Link protection');
      auditLogger.log({
        action: 'anti-link',
        executorId: message.author.id,
        guildId: message.guild.id,
        guildName: message.guild.name,
        details: { content: lowerContent.slice(0, 200) },
        success: true,
      });
      return true;
    }
  }

  if (getAntinukeFlag(guildData, 'antiZalgo')) {
    if (ZALGO_REGEX.test(content)) {
      await message.delete().catch(() => null);
      await timeoutMember(message.member, strictMode ? 30 * 60 * 1000 : 5 * 60 * 1000, 'Zalgo protection');
      auditLogger.log({
        action: 'anti-zalgo',
        executorId: message.author.id,
        guildId: message.guild.id,
        guildName: message.guild.name,
        details: {},
        success: true,
      });
      return true;
    }
  }

  if (getAntinukeFlag(guildData, 'antiCaps')) {
    if (content.length >= 12 && capsRatio >= (strictMode ? 0.65 : 0.75)) {
      await message.delete().catch(() => null);
      await timeoutMember(message.member, strictMode ? 20 * 60 * 1000 : 5 * 60 * 1000, 'Excessive caps protection');
      auditLogger.log({
        action: 'anti-caps',
        executorId: message.author.id,
        guildId: message.guild.id,
        guildName: message.guild.name,
        details: { capsRatio },
        success: true,
      });
      return true;
    }
  }

  if (getAntinukeFlag(guildData, 'antiSpam')) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const history = messageBuckets.get(key) || [];
    history.push(now);
    while (history.length > 0 && now - history[0] > 8000) {
      history.shift();
    }
    messageBuckets.set(key, history);

    const limit = strictMode ? 4 : 6;
    if (history.length > limit) {
      await message.delete().catch(() => null);
      await timeoutMember(message.member, strictMode ? 30 * 60 * 1000 : 10 * 60 * 1000, 'Spam protection');
      auditLogger.log({
        action: 'anti-spam',
        executorId: message.author.id,
        guildId: message.guild.id,
        guildName: message.guild.name,
        details: { messageCount: history.length, limit },
        success: true,
      });
      return true;
    }
  }

  return false;
}

export async function handleGuildMemberAdd(member: GuildMember): Promise<boolean> {
  const guildData = await getOrCreateGuildData(member.guild.id, member.guild.name, member.guild.ownerId);
  if (!hasAntinukeEnabled(guildData)) {
    return false;
  }

  if (member.user.bot && getAntinukeFlag(guildData, 'antiBotAdd')) {
    if (isWhitelistedForFlag(guildData, member.user.id, 'antiBotAdd')) {
      return false;
    }

    const executorId = await getRecentAuditExecutorId(member.guild, AuditLogEvent.BotAdd);
    if (executorId && !isWhitelistedForFlag(guildData, executorId, 'antiBotAdd')) {
      await member.kick('Unauthorized bot addition blocked').catch(() => null);
      await punishExecutor(member.guild, executorId, 'Unauthorized bot addition detected');
      auditLogger.log({
        action: 'anti-bot-add',
        executorId,
        targetId: member.user.id,
        targetName: member.user.tag,
        guildId: member.guild.id,
        guildName: member.guild.name,
        details: {},
        success: true,
      });
      return true;
    }

    await member.kick('Bot additions are blocked on this server').catch(() => null);
    return true;
  }

  if (!member.user.bot && getAntinukeFlag(guildData, 'antiAltJoin')) {
    if (isWhitelistedForFlag(guildData, member.user.id, 'antiAltJoin')) {
      return false;
    }

    const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
    const thresholdDays = guildData.antinuke?.strictMode ? 30 : 7;
    if (accountAgeDays < thresholdDays) {
      await member.kick(`Alt account protection (${accountAgeDays}d < ${thresholdDays}d)`).catch(() => null);
      auditLogger.log({
        action: 'anti-alt-join',
        executorId: member.user.id,
        guildId: member.guild.id,
        guildName: member.guild.name,
        details: { accountAgeDays, thresholdDays },
        success: true,
      });
      return true;
    }
  }

  return false;
}

export async function handleGuildBanAdd(event: GuildBan): Promise<boolean> {
  const guildData = await getOrCreateGuildData(event.guild.id, event.guild.name, event.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiBan')) {
    return false;
  }

  if (isWhitelistedForFlag(guildData, event.user.id, 'antiBan')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(event.guild, AuditLogEvent.MemberBanAdd);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiBan')) {
    return false;
  }

  await event.guild.members.unban(event.user.id, 'Reverting unauthorized ban').catch(() => null);
  await punishExecutor(event.guild, executorId, 'Unauthorized ban detected');
  auditLogger.log({
    action: 'anti-ban',
    executorId,
    targetId: event.user.id,
    guildId: event.guild.id,
    guildName: event.guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleGuildMemberRemove(member: GuildMember): Promise<boolean> {
  const guildData = await getOrCreateGuildData(member.guild.id, member.guild.name, member.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiKick')) {
    return false;
  }

  if (isWhitelistedForFlag(guildData, member.user.id, 'antiKick')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(member.guild, AuditLogEvent.MemberKick);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiKick')) {
    return false;
  }

  await punishExecutor(member.guild, executorId, 'Unauthorized kick detected');
  auditLogger.log({
    action: 'anti-kick',
    executorId,
    targetId: member.user.id,
    targetName: member.user.tag,
    guildId: member.guild.id,
    guildName: member.guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleChannelCreate(channel: GuildBasedChannel): Promise<boolean> {
  const guildData = await getOrCreateGuildData(channel.guild.id, channel.guild.name, channel.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiChannelCreate')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(channel.guild, AuditLogEvent.ChannelCreate);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiChannelCreate')) {
    return false;
  }

  await deleteGuildChannel(channel, 'Unauthorized channel creation detected');
  await punishExecutor(channel.guild, executorId, 'Unauthorized channel creation detected');
  auditLogger.log({
    action: 'anti-channel-create',
    executorId,
    targetId: channel.id,
    targetName: channel.name,
    guildId: channel.guild.id,
    guildName: channel.guild.name,
    details: { channelType: channel.type },
    success: true,
  });
  return true;
}

export async function handleChannelDelete(channel: GuildBasedChannel): Promise<boolean> {
  const guildData = await getOrCreateGuildData(channel.guild.id, channel.guild.name, channel.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiChannelDelete')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(channel.guild, AuditLogEvent.ChannelDelete);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiChannelDelete')) {
    return false;
  }

  await punishExecutor(channel.guild, executorId, 'Unauthorized channel deletion detected');
  auditLogger.log({
    action: 'anti-channel-delete',
    executorId,
    targetId: channel.id,
    targetName: channel.name,
    guildId: channel.guild.id,
    guildName: channel.guild.name,
    details: { channelType: channel.type },
    success: true,
  });
  return true;
}

export async function handleChannelUpdate(oldChannel: GuildBasedChannel, newChannel: GuildBasedChannel): Promise<boolean> {
  const guildData = await getOrCreateGuildData(newChannel.guild.id, newChannel.guild.name, newChannel.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiChannelUpdate')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(newChannel.guild, AuditLogEvent.ChannelUpdate);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiChannelUpdate')) {
    return false;
  }

  if ('permissionOverwrites' in newChannel && 'permissionOverwrites' in oldChannel) {
    await updateChannelLock(newChannel as any, true, 'Unauthorized channel update detected');
  }

  await punishExecutor(newChannel.guild, executorId, 'Unauthorized channel update detected');
  auditLogger.log({
    action: 'anti-channel-update',
    executorId,
    targetId: newChannel.id,
    targetName: newChannel.name,
    guildId: newChannel.guild.id,
    guildName: newChannel.guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleThreadCreate(thread: ThreadChannel): Promise<boolean> {
  const guildData = await getOrCreateGuildData(thread.guild.id, thread.guild.name, thread.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiThreadCreate')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(thread.guild, AuditLogEvent.ThreadCreate);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiThreadCreate')) {
    return false;
  }

  await deleteGuildChannel(thread, 'Unauthorized thread creation detected');
  await punishExecutor(thread.guild, executorId, 'Unauthorized thread creation detected');
  auditLogger.log({
    action: 'anti-thread-create',
    executorId,
    targetId: thread.id,
    targetName: thread.name,
    guildId: thread.guild.id,
    guildName: thread.guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleThreadDelete(thread: ThreadChannel): Promise<boolean> {
  const guildData = await getOrCreateGuildData(thread.guild.id, thread.guild.name, thread.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiThreadDelete')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(thread.guild, AuditLogEvent.ThreadDelete);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiThreadDelete')) {
    return false;
  }

  await punishExecutor(thread.guild, executorId, 'Unauthorized thread deletion detected');
  auditLogger.log({
    action: 'anti-thread-delete',
    executorId,
    targetId: thread.id,
    targetName: thread.name,
    guildId: thread.guild.id,
    guildName: thread.guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleRoleCreate(role: Role): Promise<boolean> {
  const guildData = await getOrCreateGuildData(role.guild.id, role.guild.name, role.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiRoleCreate')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(role.guild, AuditLogEvent.RoleCreate);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiRoleCreate')) {
    return false;
  }

  await deleteRole(role, 'Unauthorized role creation detected');
  await punishExecutor(role.guild, executorId, 'Unauthorized role creation detected');
  auditLogger.log({
    action: 'anti-role-create',
    executorId,
    targetId: role.id,
    targetName: role.name,
    guildId: role.guild.id,
    guildName: role.guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleRoleDelete(role: Role): Promise<boolean> {
  const guildData = await getOrCreateGuildData(role.guild.id, role.guild.name, role.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiRoleDelete')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(role.guild, AuditLogEvent.RoleDelete);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiRoleDelete')) {
    return false;
  }

  await punishExecutor(role.guild, executorId, 'Unauthorized role deletion detected');
  auditLogger.log({
    action: 'anti-role-delete',
    executorId,
    targetId: role.id,
    targetName: role.name,
    guildId: role.guild.id,
    guildName: role.guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleRoleUpdate(oldRole: Role, newRole: Role): Promise<boolean> {
  const guildData = await getOrCreateGuildData(newRole.guild.id, newRole.guild.name, newRole.guild.ownerId);
  const antiRoleUpdateEnabled = getAntinukeFlag(guildData, 'antiRoleUpdate');
  const antiPermsUpdateEnabled = getAntinukeFlag(guildData, 'antiPermsUpdate');
  if (!hasAntinukeEnabled(guildData) || (!antiRoleUpdateEnabled && !antiPermsUpdateEnabled)) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(newRole.guild, AuditLogEvent.RoleUpdate);
  if (!executorId) {
    return false;
  }

  const nameChanged = oldRole.name !== newRole.name;
  const permsChanged = oldRole.permissions.bitfield !== newRole.permissions.bitfield;
  const shouldBlockRoleUpdate = antiRoleUpdateEnabled && nameChanged;
  const shouldBlockPermsUpdate = antiPermsUpdateEnabled && permsChanged;
  if (!shouldBlockRoleUpdate && !shouldBlockPermsUpdate) {
    return false;
  }

  if (shouldBlockRoleUpdate && isWhitelistedForFlag(guildData, executorId, 'antiRoleUpdate')) {
    return false;
  }
  if (shouldBlockPermsUpdate && isWhitelistedForFlag(guildData, executorId, 'antiPermsUpdate')) {
    return false;
  }

  const reason = shouldBlockPermsUpdate ? 'Unauthorized permission update detected' : 'Unauthorized role update detected';
  await punishExecutor(newRole.guild, executorId, reason);

  if (shouldBlockRoleUpdate) {
    auditLogger.log({
      action: 'anti-role-update',
      executorId,
      targetId: newRole.id,
      targetName: newRole.name,
      guildId: newRole.guild.id,
      guildName: newRole.guild.name,
      details: { oldName: oldRole.name },
      success: true,
    });
  }

  if (shouldBlockPermsUpdate) {
    auditLogger.log({
      action: 'anti-perms-update',
      executorId,
      targetId: newRole.id,
      targetName: newRole.name,
      guildId: newRole.guild.id,
      guildName: newRole.guild.name,
      details: {},
      success: true,
    });
  }

  return true;
}

export async function handleEmojiCreate(emoji: GuildEmoji): Promise<boolean> {
  const guildData = await getOrCreateGuildData(emoji.guild.id, emoji.guild.name, emoji.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiEmojiCreate')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(emoji.guild, AuditLogEvent.EmojiCreate);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiEmojiCreate')) {
    return false;
  }

  await emoji.delete('Unauthorized emoji creation detected').catch(() => null);
  await punishExecutor(emoji.guild, executorId, 'Unauthorized emoji creation detected');
  auditLogger.log({
    action: 'anti-emoji-create',
    executorId,
    targetId: emoji.id,
    targetName: emoji.name,
    guildId: emoji.guild.id,
    guildName: emoji.guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleEmojiDelete(emoji: GuildEmoji): Promise<boolean> {
  const guildData = await getOrCreateGuildData(emoji.guild.id, emoji.guild.name, emoji.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiEmojiDelete')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(emoji.guild, AuditLogEvent.EmojiDelete);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiEmojiDelete')) {
    return false;
  }

  await punishExecutor(emoji.guild, executorId, 'Unauthorized emoji deletion detected');
  auditLogger.log({
    action: 'anti-emoji-delete',
    executorId,
    targetId: emoji.id,
    targetName: emoji.name,
    guildId: emoji.guild.id,
    guildName: emoji.guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleStickerCreate(sticker: Sticker): Promise<boolean> {
  const guild = sticker.guild;
  if (!guild) {
    return false;
  }

  const guildData = await getOrCreateGuildData(guild.id, guild.name, guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiStickerCreate')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(guild, AuditLogEvent.StickerCreate);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiStickerCreate')) {
    return false;
  }

  await sticker.delete('Unauthorized sticker creation detected').catch(() => null);
  await punishExecutor(guild, executorId, 'Unauthorized sticker creation detected');
  auditLogger.log({
    action: 'anti-sticker-create',
    executorId,
    targetId: sticker.id,
    targetName: sticker.name,
    guildId: guild.id,
    guildName: guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleStickerDelete(sticker: Sticker): Promise<boolean> {
  const guild = sticker.guild;
  if (!guild) {
    return false;
  }

  const guildData = await getOrCreateGuildData(guild.id, guild.name, guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiStickerDelete')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(guild, AuditLogEvent.StickerDelete);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiStickerDelete')) {
    return false;
  }

  await punishExecutor(guild, executorId, 'Unauthorized sticker deletion detected');
  auditLogger.log({
    action: 'anti-sticker-delete',
    executorId,
    targetId: sticker.id,
    targetName: sticker.name,
    guildId: guild.id,
    guildName: guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleGuildUpdate(oldGuild: Guild, newGuild: Guild): Promise<boolean> {
  const guildData = await getOrCreateGuildData(newGuild.id, newGuild.name, newGuild.ownerId);
  if (!hasAntinukeEnabled(guildData)) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(newGuild, AuditLogEvent.GuildUpdate);
  if (!executorId) {
    return false;
  }

  const triggered: string[] = [];
  const nameOrVisualChanged = oldGuild.name !== newGuild.name || oldGuild.icon !== newGuild.icon;
  if (getAntinukeFlag(guildData, 'antiServerUpdate') && nameOrVisualChanged && !isWhitelistedForFlag(guildData, executorId, 'antiServerUpdate')) {
    triggered.push('anti-server-update');
  }

  const oldVanity = (oldGuild as any).vanityURLCode;
  const newVanity = (newGuild as any).vanityURLCode;
  if (getAntinukeFlag(guildData, 'antiVanitySteal') && oldVanity !== newVanity && !isWhitelistedForFlag(guildData, executorId, 'antiVanitySteal')) {
    triggered.push('anti-vanity-steal');
    if (oldVanity && typeof (newGuild as any).setVanityCode === 'function') {
      await (newGuild as any).setVanityCode(oldVanity, 'Reverting unauthorized vanity update').catch(() => null);
    }
  }

  if (getAntinukeFlag(guildData, 'antiWidgetUpdate') && oldGuild.widgetEnabled !== newGuild.widgetEnabled && !isWhitelistedForFlag(guildData, executorId, 'antiWidgetUpdate')) {
    triggered.push('anti-widget-update');
  }

  const oldCommunity = oldGuild.features.includes('COMMUNITY');
  const newCommunity = newGuild.features.includes('COMMUNITY');
  if (getAntinukeFlag(guildData, 'antiCommunityUpdate') && oldCommunity !== newCommunity && !isWhitelistedForFlag(guildData, executorId, 'antiCommunityUpdate')) {
    triggered.push('anti-community-update');
  }

  const oldDiscovery = oldGuild.features.includes('DISCOVERABLE');
  const newDiscovery = newGuild.features.includes('DISCOVERABLE');
  if (getAntinukeFlag(guildData, 'antiDiscoveryUpdate') && oldDiscovery !== newDiscovery && !isWhitelistedForFlag(guildData, executorId, 'antiDiscoveryUpdate')) {
    triggered.push('anti-discovery-update');
  }

  if (triggered.length === 0) {
    return false;
  }

  await punishExecutor(newGuild, executorId, 'Unauthorized server integrity update detected');
  for (const action of triggered) {
    auditLogger.log({
      action,
      executorId,
      targetId: newGuild.id,
      targetName: newGuild.name,
      guildId: newGuild.id,
      guildName: newGuild.name,
      details: {},
      success: true,
    });
  }

  return true;
}

export async function handleAuditLogEntryCreate(entry: any, guild: Guild): Promise<boolean> {
  const guildData = await getOrCreateGuildData(guild.id, guild.name, guild.ownerId);
  if (!hasAntinukeEnabled(guildData)) {
    return false;
  }

  const executorId = entry?.executorId as string | undefined;
  if (!executorId) {
    return false;
  }

  const integrationCreateEvent = (AuditLogEvent as any).IntegrationCreate;
  if (
    getAntinukeFlag(guildData, 'antiIntegrationAdd') &&
    entry.action === integrationCreateEvent &&
    !isWhitelistedForFlag(guildData, executorId, 'antiIntegrationAdd')
  ) {
    await punishExecutor(guild, executorId, 'Unauthorized integration addition detected');
    auditLogger.log({
      action: 'anti-integration-add',
      executorId,
      targetId: entry?.targetId as string,
      guildId: guild.id,
      guildName: guild.name,
      details: {},
      success: true,
    });
    return true;
  }

  const memberPruneEvent = (AuditLogEvent as any).MemberPrune;
  if (
    getAntinukeFlag(guildData, 'antiPrune') &&
    entry.action === memberPruneEvent &&
    !isWhitelistedForFlag(guildData, executorId, 'antiPrune')
  ) {
    await punishExecutor(guild, executorId, 'Unauthorized prune action detected');
    auditLogger.log({
      action: 'anti-prune',
      executorId,
      guildId: guild.id,
      guildName: guild.name,
      details: {},
      success: true,
    });
    return true;
  }

  return false;
}

export async function handleWebhookUpdate(channel: GuildBasedChannel): Promise<boolean> {
  const guildData = await getOrCreateGuildData(channel.guild.id, channel.guild.name, channel.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiWebhookUpdate')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(channel.guild, AuditLogEvent.WebhookUpdate);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiWebhookUpdate')) {
    return false;
  }

  await punishExecutor(channel.guild, executorId, 'Unauthorized webhook update detected');
  auditLogger.log({
    action: 'anti-webhook-update',
    executorId,
    targetId: channel.id,
    targetName: channel.name,
    guildId: channel.guild.id,
    guildName: channel.guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleWebhookCreate(channel: GuildBasedChannel): Promise<boolean> {
  const guildData = await getOrCreateGuildData(channel.guild.id, channel.guild.name, channel.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiWebhookCreate')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(channel.guild, AuditLogEvent.WebhookCreate);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiWebhookCreate')) {
    return false;
  }

  await punishExecutor(channel.guild, executorId, 'Unauthorized webhook creation detected');
  auditLogger.log({
    action: 'anti-webhook-create',
    executorId,
    targetId: channel.id,
    targetName: channel.name,
    guildId: channel.guild.id,
    guildName: channel.guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleWebhookDelete(channel: GuildBasedChannel): Promise<boolean> {
  const guildData = await getOrCreateGuildData(channel.guild.id, channel.guild.name, channel.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiWebhookDelete')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(channel.guild, AuditLogEvent.WebhookDelete);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiWebhookDelete')) {
    return false;
  }

  await punishExecutor(channel.guild, executorId, 'Unauthorized webhook deletion detected');
  auditLogger.log({
    action: 'anti-webhook-delete',
    executorId,
    targetId: channel.id,
    targetName: channel.name,
    guildId: channel.guild.id,
    guildName: channel.guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleChannelPinsUpdate(channel: TextChannel): Promise<boolean> {
  const guildData = await getOrCreateGuildData(channel.guild.id, channel.guild.name, channel.guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiPins')) {
    return false;
  }

  const executorId = await getRecentAuditExecutorId(channel.guild, AuditLogEvent.MessagePin);
  if (!executorId || isWhitelistedForFlag(guildData, executorId, 'antiPins')) {
    return false;
  }

  await punishExecutor(channel.guild, executorId, 'Unauthorized pin change detected');
  auditLogger.log({
    action: 'anti-pins',
    executorId,
    targetId: channel.id,
    targetName: channel.name,
    guildId: channel.guild.id,
    guildName: channel.guild.name,
    details: {},
    success: true,
  });
  return true;
}

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<boolean> {
  const member = newState.member || oldState.member;
  const guild = newState.guild || oldState.guild;
  if (!member || !guild) {
    return false;
  }

  const guildData = await getOrCreateGuildData(guild.id, guild.name, guild.ownerId);
  if (!hasAntinukeEnabled(guildData) || !getAntinukeFlag(guildData, 'antiVcJoin')) {
    return false;
  }

  if (isWhitelistedForFlag(guildData, member.id, 'antiVcJoin')) {
    return false;
  }

  const joinedChannel = newState.channelId;
  const oldChannel = oldState.channelId;
  if (joinedChannel && joinedChannel !== oldChannel) {
    await newState.disconnect('Unauthorized voice join detected').catch(() => null);
    auditLogger.log({
      action: 'anti-vc-join',
      executorId: member.id,
      targetId: joinedChannel,
      targetName: newState.channel?.name,
      guildId: guild.id,
      guildName: guild.name,
      details: {},
      success: true,
    });
    return true;
  }

  return false;
}