import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logWebEvent } from '@/lib/serverLogger';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || GUILD_ID; // Fallback to default
};

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const isAdminUser = async () => {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      console.log('wallet isAdminUser: No bot token');
      return false;
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
    if (!userId || !selectedGuildId) {
      console.log('wallet isAdminUser: Missing user ID or guild ID', { userId, selectedGuildId });
      return false;
    }

    // Get admin role from server configuration
    const supabase = getSupabase();
    if (!supabase) {
      console.log('wallet isAdminUser: No supabase client');
      return false;
    }

    const { data: server } = await supabase
      .from('servers')
      .select('admin_role_id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    console.log('wallet isAdminUser: Server data:', server);

    if (!server?.admin_role_id) {
      console.log('wallet isAdminUser: No admin role ID found');
      return false;
    }

    console.log('wallet isAdminUser: Admin role ID:', server.admin_role_id);

    // Check Discord API for user roles
    const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    console.log('wallet isAdminUser: Member response status:', memberResponse.status);

    if (!memberResponse.ok) {
      console.log('wallet isAdminUser: Member response not ok');
      return false;
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    console.log('wallet isAdminUser: Member roles:', member.roles);
    const hasRoleResult = member.roles.includes(server.admin_role_id);
    console.log('wallet isAdminUser: Has admin role:', hasRoleResult);

    return hasRoleResult;
  } catch (error) {
    console.error('wallet isAdminUser: Admin check failed:', error);
    return false;
  }
};

const getApprovedMemberIds = async () => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return [] as string[];
  }

  const supabase = getSupabase();
  if (!supabase) {
    return [] as string[];
  }

  const selectedGuildId = await getSelectedGuildId();
  const { data: server } = await supabase
    .from('servers')
    .select('verify_role_id')
    .eq('discord_id', selectedGuildId)
    .maybeSingle();

  const verifyRoleId = server?.verify_role_id ?? null;
  if (!verifyRoleId) {
    return [] as string[];
  }

  const approved: string[] = [];
  let after: string | undefined;

  while (true) {
    const url = new URL(`https://discord.com/api/guilds/${selectedGuildId}/members`);
    url.searchParams.set('limit', '1000');
    if (after) {
      url.searchParams.set('after', after);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!response.ok) {
      break;
    }

    const members = (await response.json()) as Array<{ user: { id: string; bot?: boolean }; roles: string[] }>;
    if (!members.length) {
      break;
    }

    for (const member of members) {
      if (member.user?.bot) {
        continue;
      }
      if (member.roles?.includes(verifyRoleId)) {
        approved.push(member.user.id);
      }
    }

    after = members[members.length - 1]?.user?.id;
    if (!after) {
      break;
    }
  }

  return approved;
};

const getAdminId = async () => {
  const cookieStore = await cookies();
  return cookieStore.get('discord_user_id')?.value ?? null;
};

const getAdminProfile = async (userId: string) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return { name: 'Yetkili', avatarUrl: null };
  }

  const selectedGuildId = await getSelectedGuildId();

  const response = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!response.ok) {
    return { name: 'Yetkili', avatarUrl: null };
  }

  const member = (await response.json()) as {
    nick?: string;
    user: { id: string; username: string; avatar: string | null };
  };

  const avatarHash = member.user.avatar;
  const avatarUrl = avatarHash
    ? `https://cdn.discordapp.com/avatars/${member.user.id}/${avatarHash}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(member.user.id) % 5}.png`;

  return { name: member.nick ?? member.user.username ?? 'Yetkili', avatarUrl };
};

const upsertWallet = async (supabase: SupabaseClient, userId: string, nextBalance: number, serverId: string) => {
  await (supabase.from('member_wallets') as unknown as {
    upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<unknown>;
  }).upsert(
    {
      guild_id: serverId,
      user_id: userId,
      balance: nextBalance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );
};

const insertLedger = async (supabase: SupabaseClient, userId: string, amount: number, balanceAfter: number, serverId: string, metadata: Record<string, unknown>) => {
  await (supabase.from('wallet_ledger') as unknown as {
    insert: (values: Record<string, unknown>) => Promise<unknown>;
  }).insert({
    guild_id: serverId,
    user_id: userId,
    amount,
    type: 'admin_adjust',
    balance_after: balanceAfter,
    metadata,
  });
};

const insertNotification = async (
  supabase: SupabaseClient,
  userId: string,
  title: string,
  body: string,
  guildId: string,
  createdBy: string | null,
  authorName: string | null,
  authorAvatarUrl: string | null,
  imageUrl: string | null,
) => {
  await (supabase.from('notifications') as unknown as {
    insert: (values: Record<string, unknown>) => Promise<unknown>;
  }).insert({
    guild_id: guildId,
    title,
    body,
    type: 'mail',
    status: 'published',
    target_user_id: userId,
    created_by: createdBy,
    author_name: authorName,
    author_avatar_url: authorAvatarUrl,
    image_url: imageUrl,
  });
};

export async function POST(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const adminId = await getAdminId();

  const payload = (await request.json()) as {
    mode?: 'add' | 'remove';
    scope?: 'user' | 'all';
    amount?: number;
    userId?: string;
    message?: string;
    imageUrl?: string;
  };

  console.log('wallet POST payload:', payload);

  const parsedAmount = typeof payload.amount === 'string' ? parseFloat((payload.amount as string).replace(',', '.')) : payload.amount;
  if (!payload.mode || !payload.scope || typeof parsedAmount !== 'number' || isNaN(parsedAmount) || parsedAmount <= 0) {
    console.log('wallet POST invalid payload:', { mode: payload.mode, scope: payload.scope, amount: payload.amount, parsedAmount, amountType: typeof payload.amount });
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const amount = Number(parsedAmount.toFixed(2));
  const message = payload.message?.trim() ?? '';
  const imageUrl = payload.imageUrl?.trim() || null;
  const userId = payload.userId?.trim();

  if (payload.scope === 'user' && !userId) {
    console.log('wallet POST missing userId for user scope after trim');
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  if (payload.mode === 'add' && !message) {
    return NextResponse.json({ error: 'message_required' }, { status: 400 });
  }

  const adminProfile = adminId ? await getAdminProfile(adminId) : { name: 'Yetkili', avatarUrl: null };
  const formatMessage = (text: string) =>
    text.includes('{amount}') ? text.replaceAll('{amount}', amount.toFixed(2)) : `${text} (${amount.toFixed(2)} papel)`;

  if (payload.scope === 'user') {
    const targetUserId = userId as string;

    // Check if recipient is a member of the selected server
    const selectedGuildId = await getSelectedGuildId();
    const { data: verifyServer } = await supabase
      .from('servers')
      .select('verify_role_id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    const verifyRoleId = verifyServer?.verify_role_id ?? null;
    if (!verifyRoleId) {
      return NextResponse.json({ error: 'verify_role_missing' }, { status: 400 });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (botToken) {
      const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${targetUserId}`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      if (!memberResponse.ok) {
        return NextResponse.json({ error: 'user_not_in_server' }, { status: 400 });
      }

      const member = (await memberResponse.json()) as { roles: string[]; user?: { bot?: boolean } };
      if (member.user?.bot) {
        return NextResponse.json({ error: 'target_is_bot' }, { status: 400 });
      }
      if (!member.roles?.includes(verifyRoleId)) {
        return NextResponse.json({ error: 'target_not_verified' }, { status: 400 });
      }
    }

    const { data } = (await supabase
      .from('member_wallets')
      .select('balance')
      .eq('guild_id', selectedGuildId)
      .eq('user_id', targetUserId)
      .maybeSingle()) as unknown as { data: { balance?: number } | null };

    const current = Number(data?.balance ?? 0);
    const next = payload.mode === 'add' ? current + amount : current - amount;

    // Get server ID for consistent data
    const { data: server } = await supabase
      .from('servers')
      .select('id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    if (!server) {
      return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
    }

    const serverId = server.id;

    await upsertWallet(supabase, targetUserId, Number(next.toFixed(2)), serverId);
    await insertLedger(supabase, targetUserId, amount, Number(next.toFixed(2)), serverId, {
      mode: payload.mode,
      scope: payload.scope,
      adminId,
    });

    const title = payload.mode === 'add' ? 'Papel eklendi' : 'Papel düşüldü';
    const content = payload.mode === 'add'
      ? formatMessage(message)
      : `Yetkili tarafından ${amount} papel bakiyenizden düşüldü.`;
    await insertNotification(
      supabase,
      targetUserId,
      title,
      content,
      selectedGuildId,
      adminId,
      adminProfile.name,
      adminProfile.avatarUrl,
      imageUrl,
    );

    await logWebEvent(request, {
      event: 'admin_wallet_adjust',
      status: 'success',
      userId: adminId ?? undefined,
      guildId: selectedGuildId,
      metadata: {
        scope: 'user',
        targetUserId: userId,
        mode: payload.mode,
        amount,
        message: message || null,
        actorName: adminProfile.name,
        actorAvatarUrl: adminProfile.avatarUrl,
      },
    });

    return NextResponse.json({ status: 'ok', balance: Number(next.toFixed(2)) });
  }

  const approvedIds = await getApprovedMemberIds();
  console.log('wallet POST approvedIds:', approvedIds.length, approvedIds.slice(0, 5));
  if (!approvedIds.length) {
    console.log('wallet POST no approved users');
    return NextResponse.json({ error: 'no_approved_users' }, { status: 400 });
  }

  const selectedGuildId = await getSelectedGuildId();
  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
    .maybeSingle();

  if (!server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const serverId = server.id;

  const { data: wallets } = (await supabase
    .from('member_wallets')
    .select('user_id,balance')
    .eq('guild_id', serverId)
    .in('user_id', approvedIds)) as unknown as { data: Array<{ user_id: string; balance: number }> | null };

  const targets = wallets ?? [];

  for (const userId of approvedIds) {
    const wallet = targets.find((entry) => entry.user_id === userId);
    const current = Number(wallet?.balance ?? 0);
    const next = payload.mode === 'add' ? current + amount : current - amount;

    await upsertWallet(supabase, userId, Number(next.toFixed(2)), serverId);
    await insertLedger(supabase, userId, amount, Number(next.toFixed(2)), serverId, {
      mode: payload.mode,
      scope: payload.scope,
      adminId,
    });

    const title = payload.mode === 'add' ? 'Papel eklendi' : 'Papel düşüldü';
    const content = payload.mode === 'add'
      ? formatMessage(message)
      : `Yetkili tarafından ${amount} papel bakiyenizden düşüldü.`;
    await insertNotification(
      supabase,
      userId,
      title,
      content,
      selectedGuildId,
      adminId,
      adminProfile.name,
      adminProfile.avatarUrl,
      imageUrl,
    );
  }

  await logWebEvent(request, {
    event: 'admin_wallet_adjust',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: selectedGuildId,
    metadata: {
      scope: 'all',
      mode: payload.mode,
      amount,
      updatedCount: approvedIds.length,
      message: message || null,
      actorName: adminProfile.name,
      actorAvatarUrl: adminProfile.avatarUrl,
    },
  });

  return NextResponse.json({ status: 'ok', updated: approvedIds.length });
}
