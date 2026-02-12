import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { discord_id } = body as { discord_id?: string };
    if (!discord_id) return NextResponse.json({ error: 'missing_discord_id' }, { status: 400 });

    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const adminDiscordId = cookieStore.get('discord_user_id')?.value;
    // Basic check: only allow if developer cookie present. (Further role-checking could be added)
    if (!adminDiscordId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'db_not_configured' }, { status: 500 });

    // Nullify stored oauth tokens for the target user
    await supabase.from('users').update({ oauth_access_token: null, oauth_refresh_token: null, oauth_expires_at: null }).eq('discord_id', discord_id);
    // Remove user_guilds for that user
    await supabase.from('user_guilds').delete().eq('user_id', discord_id);

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('Error revoking oauth token:', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
