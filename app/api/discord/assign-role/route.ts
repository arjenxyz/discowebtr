import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { logWebEvent } from '@/lib/serverLogger';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function POST(request: Request) {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      await logWebEvent(request, {
        event: 'discord_role_assign_failed',
        status: 'missing_bot_token',
      });
      return NextResponse.json({ status: 'error' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    const selectedGuildId = cookieStore.get('selected_guild_id')?.value;

    if (!userId) {
      await logWebEvent(request, {
        event: 'discord_role_assign_failed',
        status: 'missing_cookie',
      });
      return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
    }

    // Seçilen sunucuyu al (select-server'den geliyorsa selected_guild_id var)
    let targetGuildId = selectedGuildId;
    let targetRoleId: string | null = null;

    if (targetGuildId) {
      // Supabase'den verify_role_id'yi al
      const supabase = getSupabase();
      if (supabase) {
        const { data: server } = await supabase
          .from('servers')
          .select('verify_role_id')
          .eq('discord_id', targetGuildId)
          .maybeSingle();

        targetRoleId = server?.verify_role_id || null;
      }
    }

    // Eğer seçilen sunucu yoksa veya verify rolü yoksa, eski davranışı kullan
    if (!targetGuildId || !targetRoleId) {
      targetGuildId = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
      targetRoleId = process.env.DISCORD_REQUIRED_ROLE_ID ?? '1465999952940498975';
    }

    const roleResponse = await fetch(
      `https://discord.com/api/guilds/${targetGuildId}/members/${userId}/roles/${targetRoleId}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bot ${botToken}` },
      },
    );

    if (!roleResponse.ok) {
      const errorBody = await roleResponse.text();
      await logWebEvent(request, {
        event: 'discord_role_assign_failed',
        status: 'role_api_failed',
        userId,
        guildId: targetGuildId,
        roleId: targetRoleId,
        metadata: {
          httpStatus: roleResponse.status,
          response: errorBody,
        },
      });
      return NextResponse.json(
        { status: 'error', detail: { status: roleResponse.status, response: errorBody } },
        { status: 403 },
      );
    }

    await logWebEvent(request, {
      event: 'discord_role_assigned',
      status: 'ok',
      userId,
      guildId: targetGuildId,
      roleId: targetRoleId,
    });
    return NextResponse.json({ status: 'ok' });
  } catch {
    await logWebEvent(request, {
      event: 'discord_role_assign_failed',
      status: 'unhandled_exception',
    });
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
