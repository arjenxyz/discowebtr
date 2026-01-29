import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logWebEvent } from '@/lib/serverLogger';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const isAdminUser = async () => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !ADMIN_ROLE_ID) {
    return false;
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('discord_user_id')?.value;
  if (!userId) {
    return false;
  }

  const memberResponse = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!memberResponse.ok) {
    return false;
  }

  const member = (await memberResponse.json()) as { roles: string[] };
  return member.roles.includes(ADMIN_ROLE_ID);
};

const getAdminId = async () => {
  const cookieStore = await cookies();
  return cookieStore.get('discord_user_id')?.value ?? null;
};

const getAdminProfile = async (userId: string) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return { name: 'Yetkili', avatarUrl: null };
  }

  const response = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
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
  const adminProfile = adminId ? await getAdminProfile(adminId) : { name: 'Yetkili', avatarUrl: null };

  const { error } = await supabase.from('notifications').insert({
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
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  await logWebEvent(request, {
    event: 'admin_notification_create',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: GUILD_ID,
    metadata: {
      title: payload.title,
      type: payload.type,
      status: payload.status ?? 'published',
      targetUserId: payload.type === 'mail' ? payload.targetUserId : null,
      detailsUrl: payload.detailsUrl ?? null,
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
    guildId: GUILD_ID,
    metadata: { id },
  });

  return NextResponse.json({ status: 'ok' });
}
