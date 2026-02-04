import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

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
      console.log('audit-logs isAdminUser: No bot token');
      return false;
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
    if (!userId || !selectedGuildId) {
      console.log('audit-logs isAdminUser: Missing user ID or guild ID', { userId, selectedGuildId });
      return false;
    }

    // Get admin role from server configuration
    const supabase = getSupabase();
    if (!supabase) {
      console.log('audit-logs isAdminUser: No supabase client');
      return false;
    }

    const { data: server } = await supabase
      .from('servers')
      .select('admin_role_id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    console.log('audit-logs isAdminUser: Server data:', server);

    if (!server?.admin_role_id) {
      console.log('audit-logs isAdminUser: No admin role ID found');
      return false;
    }

    console.log('audit-logs isAdminUser: Admin role ID:', server.admin_role_id);

    // Check Discord API for user roles
    const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    console.log('audit-logs isAdminUser: Member response status:', memberResponse.status);

    if (!memberResponse.ok) {
      console.log('audit-logs isAdminUser: Member response not ok');
      return false;
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    console.log('audit-logs isAdminUser: Member roles:', member.roles);
    const hasRoleResult = member.roles.includes(server.admin_role_id);
    console.log('audit-logs isAdminUser: Has admin role:', hasRoleResult);

    return hasRoleResult;
  } catch (error) {
    console.error('audit-logs isAdminUser: Admin check failed:', error);
    return false;
  }
};

export async function GET() {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('web_audit_logs')
    .select('id,event,status,user_id,guild_id,role_id,ip_address,created_at,metadata')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
