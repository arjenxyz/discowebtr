import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || GUILD_ID; // Fallback to default
};

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const resolveServerId = async (supabase: SupabaseClient) => {
  const selectedGuildId = await getSelectedGuildId();

  const { data: byDiscord } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
    .maybeSingle();

  if ((byDiscord as { id?: string } | null)?.id) return (byDiscord as { id?: string }).id;

  const { data: bySlug } = await supabase
    .from('servers')
    .select('id')
    .eq('slug', 'default')
    .maybeSingle();

  return (bySlug as { id?: string } | null)?.id ?? null;
};

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const cookieStore = await cookies();
  const userId = cookieStore.get('discord_user_id')?.value ?? null;

  const serverId = await resolveServerId(supabase);
  if (!serverId) return NextResponse.json({ error: 'server_not_found' }, { status: 404 });

  // Fetch active discounts for the server
  const nowIso = new Date().toISOString();
  const { data: discounts, error: discountsError } = await supabase
    .from('store_discounts')
    .select('id,code,percent,max_uses,used_count,status,expires_at,is_welcome,is_special')
    .eq('server_id', serverId)
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  if (discountsError) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  let filtered = discounts ?? [];

  // If we have a user id, filter out discounts the user already used
  if (userId && filtered.length > 0) {
    const ids = filtered.map((d: any) => d.id);
    const { data: usages } = await supabase
      .from('discount_usages')
      .select('discount_id')
      .in('discount_id', ids)
      .eq('user_id', userId);

    const usedIds = new Set((usages ?? []).map((u: any) => u.discount_id));
    filtered = filtered.filter((d: any) => !usedIds.has(d.id));
  }

  // Mark welcome coupons by DB flag
  const mapped = (filtered as any[]).map((d) => ({
    id: d.id,
    code: d.code,
    percent: Number(d.percent),
    max_uses: d.max_uses ?? null,
    used_count: d.used_count ?? 0,
    expires_at: d.expires_at ?? null,
    is_welcome: d.is_welcome ?? false,
    is_special: d.is_special ?? false,
  }));

  return NextResponse.json(mapped);
}
