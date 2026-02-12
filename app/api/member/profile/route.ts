import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || process.env.DISCORD_GUILD_ID || '1465698764453838882';
};

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function GET() {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const selectedGuildId = await getSelectedGuildId();

    const [memberResponse, rolesResponse, guildResponse] = await Promise.all([
      fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
        headers: { Authorization: `Bot ${botToken}` },
      }),
      fetch(`https://discord.com/api/guilds/${selectedGuildId}/roles`, {
        headers: { Authorization: `Bot ${botToken}` },
      }),
      fetch(`https://discord.com/api/guilds/${selectedGuildId}`, {
        headers: { Authorization: `Bot ${botToken}` },
      }),
    ]);

    if (!memberResponse.ok) {
      if (memberResponse.status === 404) {
        return NextResponse.json({ error: 'user_not_member' }, { status: 403 });
      }
      return NextResponse.json({ error: 'fetch_member_failed' }, { status: 500 });
    }

    if (!rolesResponse.ok) {
      return NextResponse.json({ error: 'fetch_roles_failed' }, { status: 500 });
    }

    const member = (await memberResponse.json()) as {
      nick?: string;
      roles: string[];
      user: { id: string; username: string; avatar: string | null; global_name?: string | null };
    };

    const roles = (await rolesResponse.json()) as Array<{ id: string; name: string; color: number; position: number }>;
    const guild = guildResponse.ok
      ? ((await guildResponse.json()) as { name: string; icon: string | null; id: string })
      : null;
    const roleMap = new Map(roles.map((role) => [role.id, role]));

    const avatarHash = member.user.avatar;
    const avatarUrl = avatarHash
      ? `https://cdn.discordapp.com/avatars/${member.user.id}/${avatarHash}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number(member.user.id) % 5}.png`;

    const supabase = getSupabase();
    let about: string | null = null;

    let serverId = selectedGuildId; // fallback
    if (supabase) {
      const { data: server } = await supabase
        .from('servers')
        .select('id')
        .eq('discord_id', selectedGuildId)
        .maybeSingle();
      
      if (server) {
        serverId = server.id;
      }
    }

    if (supabase) {
      const { data } = await supabase
        .from('member_profiles')
        .select('about')
        .eq('user_id', member.user.id)
        .eq('guild_id', serverId)
        .maybeSingle();

      about = data?.about ?? null;
    }

    return NextResponse.json({
      username: member.user.username,
      nickname: member.nick ?? null,
      displayName: member.user.global_name ?? null,
      avatarUrl,
      guildName: guild?.name ?? null,
      guildIcon: guild?.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`
        : null,
      roles: member.roles
        .map((roleId) => roleMap.get(roleId))
        .filter(Boolean)
        .sort((a, b) => (b?.position ?? 0) - (a?.position ?? 0))
        .map((role) => ({
          id: role!.id,
          name: role!.name,
          color: role!.color,
        })),
      about,
    });
  } catch {
    return NextResponse.json({ error: 'unhandled_exception' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as { about?: string | null };
    const aboutValue = payload.about?.trim() ?? '';

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
    }

    const selectedGuildId = await getSelectedGuildId();

    const { data: server } = await supabase
      .from('servers')
      .select('id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    const serverId = server?.id || selectedGuildId;

    const { error } = await supabase.from('member_profiles').upsert(
      {
        guild_id: serverId,
        user_id: userId,
        about: aboutValue.length ? aboutValue : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'guild_id,user_id' },
    );

    if (error) {
      return NextResponse.json({ error: 'save_failed' }, { status: 500 });
    }

    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ error: 'unhandled_exception' }, { status: 500 });
  }
}
