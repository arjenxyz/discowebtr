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
      console.log('discounts isAdminUser: No bot token');
      return false;
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
    if (!userId || !selectedGuildId) {
      console.log('discounts isAdminUser: Missing user ID or guild ID', { userId, selectedGuildId });
      return false;
    }

    // Get admin role from server configuration
    const supabase = getSupabase();
    if (!supabase) {
      console.log('discounts isAdminUser: No supabase client');
      return false;
    }

    const { data: server } = await supabase
      .from('servers')
      .select('admin_role_id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    console.log('discounts isAdminUser: Server data:', server);

    if (!server?.admin_role_id) {
      console.log('discounts isAdminUser: No admin role ID found');
      return false;
    }

    console.log('discounts isAdminUser: Admin role ID:', server.admin_role_id);

    // Check Discord API for user roles
    const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    console.log('discounts isAdminUser: Member response status:', memberResponse.status);

    if (!memberResponse.ok) {
      console.log('discounts isAdminUser: Member response not ok');
      return false;
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    console.log('discounts isAdminUser: Member roles:', member.roles);
    const hasRoleResult = member.roles.includes(server.admin_role_id);
    console.log('discounts isAdminUser: Has admin role:', hasRoleResult);

    return hasRoleResult;
  } catch (error) {
    console.error('discounts isAdminUser: Admin check failed:', error);
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
    .from('store_discounts')
    .select('id,code,percent,max_uses,used_count,per_user_limit,min_spend,status,expires_at,is_welcome,is_special,created_at')
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
    percent?: number;
    maxUses?: number | null;
    perUserLimit?: number | null;
    minSpend?: number | null;
    status?: 'active' | 'disabled' | 'expired';
    expiresAt?: string | null;
    is_welcome?: boolean;
    is_special?: boolean;
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

  const perUserLimit =
    typeof payload.perUserLimit === 'number' && payload.perUserLimit > 0
      ? Math.floor(payload.perUserLimit)
      : 1;

  const minSpendValue = typeof payload.minSpend === 'number' && payload.minSpend > 0 ? Number(payload.minSpend) : 0;

  const codeNormalized = payload.code.trim().toUpperCase();

  // check for existing code in the same server (case-insensitive)
  const { data: existingRows, error: existingError } = await supabase
    .from('store_discounts')
    .select('id')
    .eq('server_id', serverId)
    .eq('code', codeNormalized)
    .limit(1);

  if (existingError) {
    return NextResponse.json({ error: 'check_existing_failed' }, { status: 500 });
  }

  if (existingRows && existingRows.length > 0) {
    return NextResponse.json({ error: 'code_exists' }, { status: 400 });
  }

  const { error } = await supabase.from('store_discounts').insert({
    server_id: serverId,
    code: codeNormalized,
    percent: payload.percent,
    max_uses: maxUses,
    per_user_limit: perUserLimit,
    min_spend: minSpendValue,
    status: payload.status ?? 'active',
    expires_at: payload.expiresAt ?? null,
    is_welcome: payload.is_welcome ?? false,
    is_special: payload.is_special ?? false,
  });

  if (error) {
    return NextResponse.json({ error: 'save_failed', details: error.message }, { status: 500 });
  }

  // If this is a special (public) discount, create a system mail to inform members
  try {
    if (payload.is_special) {
      const mailTitle = `Yeni Özel Promosyon Kodu: ${codeNormalized}`;
      const mailBody = `Sunucunuz için yeni özel indirim kodu oluşturuldu: ${codeNormalized}.\n\nSepette görünmesi birkaç saniye alabilir; hesabınızda görünmüyorsa sayfayı yenileyin.`;
      await supabase.from('system_mails').insert({
        guild_id: selectedGuildId,
        user_id: null,
        title: mailTitle,
        body: mailBody,
        category: 'lottery',
        status: 'published',
        created_at: new Date().toISOString(),
      });
    }
  } catch (mailErr) {
    console.warn('admin/discounts: failed to insert system mail', mailErr);
  }

  await logWebEvent(request, {
    event: 'admin_discount_create',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: selectedGuildId,
    metadata: {
      code: payload.code,
      percent: payload.percent,
      maxUses,
        perUserLimit,
        minSpend: minSpendValue,
      status: payload.status ?? 'active',
      expiresAt: payload.expiresAt ?? null,
      is_welcome: payload.is_welcome ?? false,
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

  const { error } = await supabase.from('store_discounts').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  await logWebEvent(request, {
    event: 'admin_discount_delete',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: selectedGuildId,
    metadata: { id },
  });

  return NextResponse.json({ status: 'ok' });
}
