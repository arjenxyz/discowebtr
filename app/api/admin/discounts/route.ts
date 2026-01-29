import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logWebEvent } from '@/lib/serverLogger';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;
const DEFAULT_SLUG = 'default';

const getSupabase = () => {
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

const getAdminId = async () => {
  const cookieStore = await cookies();
  return cookieStore.get('discord_user_id')?.value ?? null;
};

const resolveServerId = async (supabase: SupabaseClient) => {
  const { data: byDiscord } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', GUILD_ID)
    .maybeSingle();

  const discordId = (byDiscord as { id?: string } | null)?.id;
  if (discordId) {
    return discordId;
  }

  const { data: bySlug } = await supabase
    .from('servers')
    .select('id')
    .eq('slug', DEFAULT_SLUG)
    .maybeSingle();

  return (bySlug as { id?: string } | null)?.id ?? null;
};

export async function GET() {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const serverId = await resolveServerId(supabase);
  if (!serverId) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('store_discounts')
    .select('id,code,percent,max_uses,used_count,status,expires_at,created_at')
    .eq('server_id', serverId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const serverId = await resolveServerId(supabase);
  if (!serverId) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const adminId = await getAdminId();
  const payload = (await request.json()) as {
    code?: string;
    percent?: number;
    maxUses?: number | null;
    status?: 'active' | 'disabled' | 'expired';
    expiresAt?: string | null;
  };

  if (!payload.code || typeof payload.percent !== 'number') {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  if (payload.percent <= 0 || payload.percent > 100) {
    return NextResponse.json({ error: 'invalid_percent' }, { status: 400 });
  }

  const maxUses =
    typeof payload.maxUses === 'number' && payload.maxUses > 0
      ? Math.floor(payload.maxUses)
      : null;

  const { error } = await supabase.from('store_discounts').insert({
    server_id: serverId,
    code: payload.code,
    percent: payload.percent,
    max_uses: maxUses,
    status: payload.status ?? 'active',
    expires_at: payload.expiresAt ?? null,
  });

  if (error) {
    return NextResponse.json({ error: 'save_failed', details: error.message }, { status: 500 });
  }

  await logWebEvent(request, {
    event: 'admin_discount_create',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: GUILD_ID,
    metadata: {
      code: payload.code,
      percent: payload.percent,
      maxUses,
      status: payload.status ?? 'active',
      expiresAt: payload.expiresAt ?? null,
    },
  });

  return NextResponse.json({ status: 'ok' });
}

export async function DELETE(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const adminId = await getAdminId();
  const { id } = (await request.json()) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const { error } = await supabase.from('store_discounts').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  await logWebEvent(request, {
    event: 'admin_discount_delete',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: GUILD_ID,
    metadata: { id },
  });

  return NextResponse.json({ status: 'ok' });
}
