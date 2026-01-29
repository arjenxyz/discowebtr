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
    .from('store_items')
    .select('id,title,description,price,status,role_id,duration_days,created_at')
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
    title?: string;
    description?: string;
    price?: number;
    status?: 'active' | 'inactive';
    roleId?: string | null;
    durationDays?: number;
  };

  if (!payload.title || typeof payload.price !== 'number' || !payload.roleId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  if (typeof payload.durationDays !== 'number' || payload.durationDays < 0) {
    return NextResponse.json({ error: 'invalid_duration' }, { status: 400 });
  }

  const { error } = await supabase.from('store_items').insert({
    server_id: serverId,
    title: payload.title,
    description: payload.description ?? null,
    price: payload.price,
    status: payload.status ?? 'active',
    role_id: payload.roleId,
    duration_days: payload.durationDays,
  });

  if (error) {
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  await logWebEvent(request, {
    event: 'admin_store_item_create',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: GUILD_ID,
    roleId: payload.roleId ?? undefined,
    metadata: {
      title: payload.title,
      price: payload.price,
      durationDays: payload.durationDays,
      status: payload.status ?? 'active',
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

  const { error } = await supabase.from('store_items').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  await logWebEvent(request, {
    event: 'admin_store_item_delete',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: GUILD_ID,
    metadata: { id },
  });

  return NextResponse.json({ status: 'ok' });
}

export async function PUT(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const adminId = await getAdminId();
  const payload = (await request.json()) as {
    id?: string;
    title?: string;
    description?: string | null;
    price?: number;
    status?: 'active' | 'inactive';
    roleId?: string | null;
    durationDays?: number;
  };

  if (!payload.id || !payload.title || typeof payload.price !== 'number' || !payload.roleId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  if (typeof payload.durationDays !== 'number' || payload.durationDays < 0) {
    return NextResponse.json({ error: 'invalid_duration' }, { status: 400 });
  }

  const { error } = await supabase
    .from('store_items')
    .update({
      title: payload.title,
      description: payload.description ?? null,
      price: payload.price,
      status: payload.status ?? 'active',
      role_id: payload.roleId,
      duration_days: payload.durationDays,
    })
    .eq('id', payload.id);

  if (error) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  await logWebEvent(request, {
    event: 'admin_store_item_update',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: GUILD_ID,
    roleId: payload.roleId ?? undefined,
    metadata: {
      id: payload.id,
      title: payload.title,
      price: payload.price,
      durationDays: payload.durationDays,
      status: payload.status ?? 'active',
    },
  });

  return NextResponse.json({ status: 'ok' });
}
