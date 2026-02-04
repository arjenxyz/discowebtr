import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logWebEvent } from '@/lib/serverLogger';

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
      console.log('notifications isAdminUser: No bot token');
      return false;
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
    if (!userId || !selectedGuildId) {
      console.log('notifications isAdminUser: Missing user ID or guild ID', { userId, selectedGuildId });
      return false;
    }

    // Get admin role from server configuration
    const supabase = getSupabase();
    if (!supabase) {
      console.log('notifications isAdminUser: No supabase client');
      return false;
    }

    const { data: server } = await supabase
      .from('servers')
      .select('admin_role_id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    console.log('notifications isAdminUser: Server data:', server);

    if (!server?.admin_role_id) {
      console.log('notifications isAdminUser: No admin role ID found');
      return false;
    }

    console.log('notifications isAdminUser: Admin role ID:', server.admin_role_id);

    // Check Discord API for user roles
    const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    console.log('notifications isAdminUser: Member response status:', memberResponse.status);

    if (!memberResponse.ok) {
      console.log('notifications isAdminUser: Member response not ok');
      return false;
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    console.log('notifications isAdminUser: Member roles:', member.roles);
    const hasRoleResult = member.roles.includes(server.admin_role_id);
    console.log('notifications isAdminUser: Has admin role:', hasRoleResult);

    return hasRoleResult;
  } catch (error) {
    console.error('notifications isAdminUser: Admin check failed:', error);
    return false;
  }
};

const getAdminId = async () => {
  const cookieStore = await cookies();
  return cookieStore.get('discord_user_id')?.value ?? null;
};

const getAdminProfile = async (userId: string, guildId: string) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return { name: 'Yetkili', avatarUrl: null };
  }

  const response = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!response.ok) {
    return { name: 'Yetkili', avatarUrl: null };
  }

  const member = (await response.json()) as {
    nick?: string;
    user: { id: string; username: string; avatar: string | null };
  };

  const avatarHash = member.user.avatar;
  const avatarUrl = avatarHash
    ? `https://cdn.discordapp.com/avatars/${member.user.id}/${avatarHash}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(member.user.id) % 5}.png`;

  return { name: member.nick ?? member.user.username ?? 'Yetkili', avatarUrl };
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
    .from('notifications')
    .select('id,title,body,type,status,created_at,created_by,target_user_id,author_name,author_avatar_url,details_url,image_url')
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

  const payload = (await request.json()) as {
    title?: string;
    body?: string;
    type?: 'announcement' | 'mail';
    status?: 'published' | 'draft';
    targetUserId?: string | null;
    detailsUrl?: string | null;
    imageUrl?: string | null;
  };

  if (!payload.title || !payload.body || !payload.type) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  if (payload.type === 'mail' && !payload.targetUserId) {
    return NextResponse.json({ error: 'target_required' }, { status: 400 });
  }

  const adminId = await getAdminId();
  const selectedGuildId = await getSelectedGuildId();
  const adminProfile = adminId
    ? await getAdminProfile(adminId, selectedGuildId)
    : { name: 'Yetkili', avatarUrl: null };

  if (payload.type === 'mail' && payload.targetUserId) {
    const { data: server } = await supabase
      .from('servers')
      .select('verify_role_id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    const verifyRoleId = server?.verify_role_id ?? null;
    if (!verifyRoleId) {
      return NextResponse.json({ error: 'verify_role_missing' }, { status: 400 });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
    }

    const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${payload.targetUserId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!memberResponse.ok) {
      return NextResponse.json({ error: 'target_not_in_server' }, { status: 400 });
    }

    const member = (await memberResponse.json()) as { roles: string[]; user?: { bot?: boolean } };
    if (member.user?.bot) {
      return NextResponse.json({ error: 'target_is_bot' }, { status: 400 });
    }
    if (!member.roles?.includes(verifyRoleId)) {
      return NextResponse.json({ error: 'target_not_verified' }, { status: 400 });
    }
  }

  const { error } = await supabase.from('notifications').insert({
    guild_id: selectedGuildId,
    title: payload.title,
    body: payload.body,
    type: payload.type,
    status: payload.status ?? 'published',
    target_user_id: payload.type === 'mail' ? payload.targetUserId : null,
    created_by: adminId,
    author_name: adminProfile.name,
    author_avatar_url: adminProfile.avatarUrl,
    details_url: payload.detailsUrl ?? null,
    image_url: payload.imageUrl ?? null,
  });

  if (error) {
    console.error('notifications POST save_failed:', error);
    return NextResponse.json(
      { error: 'save_failed', detail: error.message, code: error.code },
      { status: 500 },
    );
  }

  await logWebEvent(request, {
    event: 'admin_notification_create',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: selectedGuildId,
    metadata: {
      title: payload.title,
      type: payload.type,
      status: payload.status ?? 'published',
      targetUserId: payload.type === 'mail' ? payload.targetUserId : null,
      detailsUrl: payload.detailsUrl ?? null,
      actorName: adminProfile.name,
      actorAvatarUrl: adminProfile.avatarUrl,
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
  const adminProfile = adminId
    ? await getAdminProfile(adminId, selectedGuildId)
    : { name: 'Yetkili', avatarUrl: null };
  const { id } = (await request.json()) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  await logWebEvent(request, {
    event: 'admin_notification_delete',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: selectedGuildId,
    metadata: {
      id,
      actorName: adminProfile.name,
      actorAvatarUrl: adminProfile.avatarUrl,
    },
  });

  return NextResponse.json({ status: 'ok' });
}
