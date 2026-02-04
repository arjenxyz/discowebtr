import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || GUILD_ID;
};

export async function GET() {
  const maintenance = await checkMaintenance(['site', 'store']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const selectedGuildId = await getSelectedGuildId();

  const { data: server, error: serverError } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
    .maybeSingle();

  if (serverError || !server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const now = new Date().toISOString();

  const { data: promotions, error: promotionsError } = await supabase
    .from('promotions')
    .select('id,code,value,max_uses,used_count,status,expires_at,created_at')
    .eq('server_id', server.id)
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (promotionsError) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const { data: items, error: itemsError } = await supabase
    .from('store_items')
    .select('id,title,description,price,status,role_id,created_at')
    .eq('server_id', server.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20);

  if (itemsError) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  return NextResponse.json({ promotions: promotions ?? [], items: items ?? [] });
}
