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
      console.log('roles isAdminUser: No bot token');
      return false;
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
    console.log('roles isAdminUser: userId:', userId, 'selectedGuildId:', selectedGuildId);
    if (!userId || !selectedGuildId) {
      console.log('roles isAdminUser: Missing user ID or guild ID', { userId, selectedGuildId });
      return false;
    }

    // Get admin role from server configuration
    const supabase = getSupabase();
    if (!supabase) {
      console.log('roles isAdminUser: No supabase client');
      return false;
    }

    const { data: server } = await supabase
      .from('servers')
      .select('admin_role_id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    console.log('roles isAdminUser: Server data:', server);

    if (!server?.admin_role_id) {
      console.log('roles isAdminUser: No admin role ID found');
      return false;
    }

    console.log('roles isAdminUser: Admin role ID:', server.admin_role_id);

    // Check Discord API for user roles
    const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    console.log('roles isAdminUser: Member response status:', memberResponse.status);

    if (!memberResponse.ok) {
      console.log('roles isAdminUser: Member response not ok');
      return false;
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    console.log('roles isAdminUser: Member roles:', member.roles);
    const hasRoleResult = member.roles.includes(server.admin_role_id);
    console.log('roles isAdminUser: Has admin role:', hasRoleResult);

    return hasRoleResult;
  } catch (error) {
    console.error('roles isAdminUser: Admin check failed:', error);
    return false;
  }
};

export async function GET(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
  }

  const selectedGuildId = await getSelectedGuildId();

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('query') ?? '').trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);

  const response = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const roles = (await response.json()) as Array<{
    id: string;
    name: string;
    color: number;
    position: number;
    managed?: boolean;
  }>;

  const filtered = roles
    .filter((role) => !role.managed)
    .sort((a, b) => b.position - a.position)
    .filter((role) => (query ? role.name.toLowerCase().includes(query) || role.id.includes(query) : true))
    .slice(0, limit)
    .map((role) => ({
      id: role.id,
      name: role.name,
      color: role.color,
    }));

  return NextResponse.json(filtered);
}
