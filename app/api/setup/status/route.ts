import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const guildId = url.searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'missing_guild_id' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('servers')
    .select('discord_id,is_setup')
    .eq('discord_id', guildId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  return NextResponse.json({
    exists: !!data,
    is_setup: !!data?.is_setup,
  });
}
