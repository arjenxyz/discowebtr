import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logWebEvent } from '@/lib/serverLogger';

const DEFAULT_DEVELOPER_GUILD_ID = '1465698764453838882';
const DEFAULT_DEVELOPER_ROLE_ID = '1467580199481639013';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const checkDeveloperAccess = async (request: NextRequest): Promise<boolean> => {
  try {
    const cookies = request.cookies;
    const discordUserId = cookies.get('discord_user_id')?.value;

    if (!discordUserId) {
      return false;
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return false;
    }

    const developerRoleId = process.env.DEVELOPER_ROLE_ID ?? DEFAULT_DEVELOPER_ROLE_ID;
    const developerGuildId = process.env.DEVELOPER_GUILD_ID ?? DEFAULT_DEVELOPER_GUILD_ID;

    const developerResponse = await fetch(
      `https://discord.com/api/guilds/${developerGuildId}/members/${discordUserId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
      },
    );

    if (!developerResponse.ok) {
      return false;
    }

    const developerMember = (await developerResponse.json()) as { roles: string[] };
    return developerMember.roles.includes(developerRoleId);
  } catch {
    return false;
  }
};

export async function POST(request: NextRequest) {
  if (!(await checkDeveloperAccess(request))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const payload = (await request.json()) as {
    category?: 'sponsor' | 'update';
    title?: string;
    body?: string;
    imageUrl?: string | null;
    detailsUrl?: string | null;
  };

  if (!payload.category || !payload.title || !payload.body) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const cookies = request.cookies;
  const discordUserId = cookies.get('discord_user_id')?.value;
  const selectedGuildId = cookies.get('selected_guild_id')?.value || DEFAULT_DEVELOPER_GUILD_ID;

  // Get developer profile for author info
  let authorName = 'Developer';
  let authorAvatarUrl: string | null = null;
  if (discordUserId) {
    try {
      const userResponse = await fetch(`https://discord.com/api/users/${discordUserId}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      });
      if (userResponse.ok) {
        const user = (await userResponse.json()) as { username: string; avatar: string | null };
        authorName = user.username;
        if (user.avatar) {
          authorAvatarUrl = `https://cdn.discordapp.com/avatars/${discordUserId}/${user.avatar}.png`;
        }
      }
    } catch {
      // ignore
    }
  }

  const { error } = await supabase.from('system_mails').insert({
    guild_id: selectedGuildId,
    user_id: null, // All users
    title: payload.title,
    body: payload.body,
    category: payload.category,
    status: 'published',
    created_by: discordUserId,
    author_name: authorName,
    author_avatar_url: authorAvatarUrl,
    image_url: payload.imageUrl || null,
    details_url: payload.detailsUrl || null,
  });

  if (error) {
    console.error('system_mails POST save_failed:', error);
    return NextResponse.json(
      { error: 'save_failed', detail: error.message, code: error.code },
      { status: 500 },
    );
  }

  await logWebEvent(request, {
    event: 'developer_system_mail_create',
    status: 'success',
    userId: discordUserId ?? undefined,
    guildId: selectedGuildId,
    metadata: {
      category: payload.category,
      title: payload.title,
      imageUrl: payload.imageUrl ?? null,
      detailsUrl: payload.detailsUrl ?? null,
      authorName,
      authorAvatarUrl,
    },
  });

  return NextResponse.json({ status: 'ok' });
}