import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';

const DEFAULT_SLUG = 'default';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
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

  const { data: server, error: serverError } = await supabase
    .from('servers')
    .select('id')
    .eq('slug', DEFAULT_SLUG)
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
