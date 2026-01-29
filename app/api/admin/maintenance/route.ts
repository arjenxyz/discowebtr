import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logWebEvent } from '@/lib/serverLogger';

const DEFAULT_SLUG = 'default';
const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;
const MAINTENANCE_ROLE_ID =
  process.env.MAINTENANCE_ROLE_ID ?? process.env.DISCORD_MAINTENANCE_ROLE_ID;

const MAINTENANCE_KEYS = [
  'site',
  'store',
  'transactions',
  'tracking',
  'promotions',
  'discounts',
  'transfers',
] as const;

type MaintenanceKey = (typeof MAINTENANCE_KEYS)[number];

type MaintenanceFlag = {
  id: string;
  key: MaintenanceKey;
  is_active: boolean;
  reason: string | null;
  updated_by: string | null;
  updated_at: string;
};

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getUserId = async () => {
  const cookieStore = await cookies();
  return cookieStore.get('discord_user_id')?.value ?? null;
};

const hasRole = async (userId: string, roleId?: string | null) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !roleId) {
    return false;
  }

  const memberResponse = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!memberResponse.ok) {
    return false;
  }

  const member = (await memberResponse.json()) as { roles: string[] };
  return member.roles.includes(roleId);
};

const getDiscordProfile = async (userId: string) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return null;
  }

  const response = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!response.ok) {
    return null;
  }

  const member = (await response.json()) as {
    nick?: string;
    user?: { id: string; username: string; avatar: string | null; global_name?: string | null };
  };

  const id = member.user?.id ?? userId;
  const avatarHash = member.user?.avatar;
  const avatarUrl = avatarHash
    ? `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.png?size=96`
    : `https://cdn.discordapp.com/embed/avatars/${Number(id) % 5}.png`;

  return {
    id,
    name: member.nick ?? member.user?.global_name ?? member.user?.username ?? id,
    avatarUrl,
  };
};

const isMaintenanceAdmin = async () => {
  const userId = await getUserId();
  if (!userId) {
    return { ok: false, userId: null };
  }

  const [isAdmin, hasMaintenanceRole] = await Promise.all([
    hasRole(userId, ADMIN_ROLE_ID),
    hasRole(userId, MAINTENANCE_ROLE_ID),
  ]);

  return { ok: isAdmin && hasMaintenanceRole, userId };
};

const ensureFlags = async (supabase: SupabaseClient, serverId: string) => {
  const { data, error } = await supabase
    .from('maintenance_flags')
    .select('id,key,is_active,reason,updated_by,updated_at')
    .eq('server_id', serverId)
    .order('key', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  if (data && data.length === MAINTENANCE_KEYS.length) {
    return data as MaintenanceFlag[];
  }

  const existingKeys = new Set((data ?? []).map((row) => row.key));
  const missing = MAINTENANCE_KEYS.filter((key) => !existingKeys.has(key));

  if (missing.length > 0) {
    const { error: insertError } = await supabase.from('maintenance_flags').insert(
      missing.map((key) => ({
        server_id: serverId,
        key,
        is_active: false,
      })),
    );

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from('maintenance_flags')
    .select('id,key,is_active,reason,updated_by,updated_at')
    .eq('server_id', serverId)
    .order('key', { ascending: true });

  if (refreshError) {
    throw new Error(refreshError.message);
  }

  return (refreshed ?? []) as MaintenanceFlag[];
};

export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
    }

    const { ok } = await isMaintenanceAdmin();
    if (!ok) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { data: server, error } = await supabase
      .from('servers')
      .select('id,name')
      .eq('slug', DEFAULT_SLUG)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'server_fetch_failed', detail: error.message }, { status: 500 });
    }

    if (!server) {
      return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
    }

    const flags = await ensureFlags(supabase, server.id);
    const updaterIds = flags
      .map((flag) => flag.updated_by)
      .filter((value): value is string => Boolean(value));
    const uniqueIds = [...new Set(updaterIds)];
    const profiles = await Promise.all(uniqueIds.map(async (id) => [id, await getDiscordProfile(id)]));
    const updaterProfiles = Object.fromEntries(
      profiles.filter(([, profile]) => profile).map(([id, profile]) => [id, profile]),
    ) as Record<string, { id: string; name: string; avatarUrl: string }>;

    return NextResponse.json({ server, flags, keys: MAINTENANCE_KEYS, updaterProfiles });
  } catch (error) {
    return NextResponse.json(
      { error: 'unexpected', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
    }

    const { ok, userId } = await isMaintenanceAdmin();
    if (!ok || !userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      key?: string;
      is_active?: boolean;
      reason?: string | null;
    };

    if (!body.key || !MAINTENANCE_KEYS.includes(body.key as MaintenanceKey)) {
      return NextResponse.json({ error: 'invalid_key' }, { status: 400 });
    }

    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('id')
      .eq('slug', DEFAULT_SLUG)
      .maybeSingle();

    if (serverError) {
      return NextResponse.json({ error: 'server_fetch_failed', detail: serverError.message }, { status: 500 });
    }

    if (!server) {
      return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('maintenance_flags')
      .upsert(
        {
          server_id: server.id,
          key: body.key,
          is_active: Boolean(body.is_active),
          reason: body.reason ?? null,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'server_id,key' },
      );

    if (error) {
      return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 });
    }

    await logWebEvent(request, {
      event: 'admin_maintenance_update',
      status: body.is_active ? 'enabled' : 'disabled',
      metadata: { key: body.key, reason: body.reason ?? null },
    });

    const flags = await ensureFlags(supabase, server.id);
    const updaterIds = flags
      .map((flag) => flag.updated_by)
      .filter((value): value is string => Boolean(value));
    const uniqueIds = [...new Set(updaterIds)];
    const profiles = await Promise.all(uniqueIds.map(async (id) => [id, await getDiscordProfile(id)]));
    const updaterProfiles = Object.fromEntries(
      profiles.filter(([, profile]) => profile).map(([id, profile]) => [id, profile]),
    ) as Record<string, { id: string; name: string; avatarUrl: string }>;

    return NextResponse.json({ ok: true, flags, updaterProfiles });
  } catch (error) {
    return NextResponse.json(
      { error: 'unexpected', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 },
    );
  }
}
