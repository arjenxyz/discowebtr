import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { logWebEvent } from '@/lib/serverLogger';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const REQUIRED_ROLE_ID = process.env.DISCORD_REQUIRED_ROLE_ID ?? '1465999952940498975';

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

    if (!userId) {
      await logWebEvent(request, {
        event: 'discord_role_assign_failed',
        status: 'missing_cookie',
      });
      return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
    }

    const roleResponse = await fetch(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${userId}/roles/${REQUIRED_ROLE_ID}`,
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
        guildId: GUILD_ID,
        roleId: REQUIRED_ROLE_ID,
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
      guildId: GUILD_ID,
      roleId: REQUIRED_ROLE_ID,
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
