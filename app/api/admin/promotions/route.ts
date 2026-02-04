import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logWebEvent } from '@/lib/serverLogger';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const DEFAULT_SLUG = 'default';

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || GUILD_ID; // Fallback to default
};

const getSupabase = () => {
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
      console.log('promotions isAdminUser: No bot token');
      return false;
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
    if (!userId || !selectedGuildId) {
      console.log('promotions isAdminUser: Missing user ID or guild ID', { userId, selectedGuildId });
      return false;
    }

    // Get admin role from server configuration
    const supabase = getSupabase();
    if (!supabase) {
      console.log('promotions isAdminUser: No supabase client');
      return false;
    }

    const { data: server } = await supabase
      .from('servers')
      .select('admin_role_id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    console.log('promotions isAdminUser: Server data:', server);

    if (!server?.admin_role_id) {
      console.log('promotions isAdminUser: No admin role ID found');
      return false;
    }

    console.log('promotions isAdminUser: Admin role ID:', server.admin_role_id);

    // Check Discord API for user roles
    const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    console.log('promotions isAdminUser: Member response status:', memberResponse.status);

    if (!memberResponse.ok) {
      console.log('promotions isAdminUser: Member response not ok');
      return false;
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    console.log('promotions isAdminUser: Member roles:', member.roles);
    const hasRoleResult = member.roles.includes(server.admin_role_id);
    console.log('promotions isAdminUser: Has admin role:', hasRoleResult);

    return hasRoleResult;
  } catch (error) {
    console.error('promotions isAdminUser: Admin check failed:', error);
    return false;
  }
};

const getAdminId = async () => {
  const cookieStore = await cookies();
  return cookieStore.get('discord_user_id')?.value ?? null;
};

const resolveServerId = async (supabase: SupabaseClient) => {
  const selectedGuildId = await getSelectedGuildId();

  const { data: byDiscord } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
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
    .from('promotions')
    .select('id,code,value,max_uses,used_count,status,expires_at,created_at')
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
  const selectedGuildId = await getSelectedGuildId();
  const payload = (await request.json()) as {
    code?: string;
    value?: number;
    maxUses?: number | null;
    status?: 'active' | 'disabled' | 'expired';
    expiresAt?: string | null;
  };

  if (!payload.code || typeof payload.value !== 'number') {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  if (payload.value <= 0) {
    return NextResponse.json({ error: 'invalid_value' }, { status: 400 });
  }

  const maxUses =
    typeof payload.maxUses === 'number' && payload.maxUses > 0
      ? Math.floor(payload.maxUses)
      : null;

  const { error } = await supabase.from('promotions').insert({
    server_id: serverId,
    code: payload.code,
    value: payload.value,
    max_uses: maxUses,
    status: payload.status ?? 'active',
    expires_at: payload.expiresAt ?? null,
  });

  if (error) {
    return NextResponse.json({ error: 'save_failed', details: error.message }, { status: 500 });
  }

  await logWebEvent(request, {
    event: 'admin_promo_create',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: selectedGuildId,
    metadata: {
      code: payload.code,
      value: payload.value,
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
  const selectedGuildId = await getSelectedGuildId();
  const { id } = (await request.json()) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  await logWebEvent(request, {
    event: 'admin_promo_delete',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: selectedGuildId,
    metadata: { id },
  });

  return NextResponse.json({ status: 'ok' });
}
