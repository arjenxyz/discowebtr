import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logWebEvent } from '@/lib/serverLogger';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;
const REQUIRED_ROLE_ID = process.env.REQUIRED_ROLE_ID ?? process.env.DISCORD_REQUIRED_ROLE_ID;

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const isAdminUser = async () => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !ADMIN_ROLE_ID) {
    return false;
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('discord_user_id')?.value;
  if (!userId) {
    return false;
  }

  const memberResponse = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!memberResponse.ok) {
    return false;
  }

  const member = (await memberResponse.json()) as { roles: string[] };
  return member.roles.includes(ADMIN_ROLE_ID);
};

const hasRequiredRole = async (userId: string) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !REQUIRED_ROLE_ID) {
    return false;
  }

  const memberResponse = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!memberResponse.ok) {
    return false;
  }

  const member = (await memberResponse.json()) as { roles: string[] };
  return member.roles.includes(REQUIRED_ROLE_ID);
};

const getApprovedMemberIds = async () => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !REQUIRED_ROLE_ID) {
    return [] as string[];
  }

  const approved: string[] = [];
  let after: string | undefined;

  while (true) {
    const url = new URL(`https://discord.com/api/guilds/${GUILD_ID}/members`);
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

    const members = (await response.json()) as Array<{ user: { id: string }; roles: string[] }>;
    if (!members.length) {
      break;
    }

    for (const member of members) {
      if (member.roles?.includes(REQUIRED_ROLE_ID)) {
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

  const response = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
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

const upsertWallet = async (supabase: SupabaseClient, userId: string, nextBalance: number) => {
  await (supabase.from('member_wallets') as unknown as {
    upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<unknown>;
  }).upsert(
    {
      guild_id: GUILD_ID,
      user_id: userId,
      balance: nextBalance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );
};

const insertLedger = async (supabase: SupabaseClient, userId: string, amount: number, balanceAfter: number, metadata: Record<string, unknown>) => {
  await (supabase.from('wallet_ledger') as unknown as {
    insert: (values: Record<string, unknown>) => Promise<unknown>;
  }).insert({
    guild_id: GUILD_ID,
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
  createdBy: string | null,
  authorName: string | null,
  authorAvatarUrl: string | null,
  imageUrl: string | null,
) => {
  await (supabase.from('notifications') as unknown as {
    insert: (values: Record<string, unknown>) => Promise<unknown>;
  }).insert({
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

  if (!payload.mode || !payload.scope || typeof payload.amount !== 'number' || payload.amount <= 0) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  if (payload.scope === 'user' && !payload.userId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const amount = Number(payload.amount.toFixed(2));
  const message = payload.message?.trim() ?? '';
  const imageUrl = payload.imageUrl?.trim() || null;

  if (payload.mode === 'add' && !message) {
    return NextResponse.json({ error: 'message_required' }, { status: 400 });
  }

  const adminProfile = adminId ? await getAdminProfile(adminId) : { name: 'Yetkili', avatarUrl: null };
  const formatMessage = (text: string) =>
    text.includes('{amount}') ? text.replaceAll('{amount}', amount.toFixed(2)) : `${text} (${amount.toFixed(2)} papel)`;

  if (payload.scope === 'user') {
    const userId = payload.userId as string;
    if (!(await hasRequiredRole(userId))) {
      return NextResponse.json({ error: 'not_approved_user' }, { status: 400 });
    }
    const { data } = (await supabase
      .from('member_wallets')
      .select('balance')
      .eq('guild_id', GUILD_ID)
      .eq('user_id', userId)
      .maybeSingle()) as unknown as { data: { balance?: number } | null };

    const current = Number(data?.balance ?? 0);
    const next = payload.mode === 'add' ? current + amount : Math.max(0, current - amount);

    await upsertWallet(supabase, userId, Number(next.toFixed(2)));
    await insertLedger(supabase, userId, amount, Number(next.toFixed(2)), {
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
      adminId,
      adminProfile.name,
      adminProfile.avatarUrl,
      imageUrl,
    );

    await logWebEvent(request, {
      event: 'admin_wallet_adjust',
      status: 'success',
      userId: adminId ?? undefined,
      guildId: GUILD_ID,
      metadata: {
        scope: 'user',
        targetUserId: userId,
        mode: payload.mode,
        amount,
        message: message || null,
      },
    });

    return NextResponse.json({ status: 'ok', balance: Number(next.toFixed(2)) });
  }

  const approvedIds = await getApprovedMemberIds();
  if (!approvedIds.length) {
    return NextResponse.json({ error: 'no_approved_users' }, { status: 400 });
  }

  const { data: wallets } = (await supabase
    .from('member_wallets')
    .select('user_id,balance')
    .eq('guild_id', GUILD_ID)
    .in('user_id', approvedIds)) as unknown as { data: Array<{ user_id: string; balance: number }> | null };

  const targets = wallets ?? [];

  for (const userId of approvedIds) {
    const wallet = targets.find((entry) => entry.user_id === userId);
    const current = Number(wallet?.balance ?? 0);
    const next = payload.mode === 'add' ? current + amount : Math.max(0, current - amount);

    await upsertWallet(supabase, userId, Number(next.toFixed(2)));
    await insertLedger(supabase, userId, amount, Number(next.toFixed(2)), {
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
    guildId: GUILD_ID,
    metadata: {
      scope: 'all',
      mode: payload.mode,
      amount,
      updatedCount: approvedIds.length,
      message: message || null,
    },
  });

  return NextResponse.json({ status: 'ok', updated: approvedIds.length });
}
