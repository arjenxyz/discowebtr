import { NextResponse } from 'next/server';
import { logWebEvent } from '@/lib/serverLogger';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const REQUIRED_ROLE_ID = process.env.DISCORD_REQUIRED_ROLE_ID ?? '1465999952940498975';
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;

export async function POST(request: Request) {
  try {
    const { code } = (await request.json()) as { code?: string };

    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!code || !clientId || !clientSecret || !redirectUri || !botToken) {
      await logWebEvent(request, {
        event: 'discord_exchange_failed',
        status: 'missing_env_or_code',
      });
      return NextResponse.json({ status: 'error' }, { status: 400 });
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      scope: 'identify',
    });

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!tokenResponse.ok) {
      await logWebEvent(request, {
        event: 'discord_exchange_failed',
        status: 'token_exchange_failed',
      });
      return NextResponse.json({ status: 'error' }, { status: 401 });
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      await logWebEvent(request, {
        event: 'discord_exchange_failed',
        status: 'user_fetch_failed',
      });
      return NextResponse.json({ status: 'error' }, { status: 401 });
    }

    const user = (await userResponse.json()) as { id: string; username: string };

    const memberResponse = await fetch(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
      },
    );

    if (!memberResponse.ok) {
      await logWebEvent(request, {
        event: 'discord_exchange_failed',
        status: 'member_fetch_failed',
        userId: user.id,
        guildId: GUILD_ID,
        roleId: REQUIRED_ROLE_ID,
      });
      return NextResponse.json({ status: 'error' }, { status: 403 });
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    const hasRole = member.roles.includes(REQUIRED_ROLE_ID);
    const isAdmin = ADMIN_ROLE_ID ? member.roles.includes(ADMIN_ROLE_ID) : false;

    const response = NextResponse.json({ status: hasRole ? 'ok' : 'needs_rules', isAdmin });
    response.cookies.set('discord_user_id', user.id, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    await logWebEvent(request, {
      event: 'discord_role_check',
      status: hasRole ? 'has_role' : 'missing_role',
      userId: user.id,
      guildId: GUILD_ID,
      roleId: REQUIRED_ROLE_ID,
      metadata: { username: user.username },
    });

    return response;
  } catch {
    await logWebEvent(request, {
      event: 'discord_exchange_failed',
      status: 'unhandled_exception',
    });
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
