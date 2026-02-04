import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_DEVELOPER_GUILD_ID = '1465698764453838882';
const DEFAULT_DEVELOPER_ROLE_ID = '1467580199481639013';

export async function GET(request: NextRequest) {
  try {
    // Kullanıcı ID'sini cookie'den al
    const cookies = request.cookies;
    const discordUserId = cookies.get('discord_user_id')?.value;

    if (!discordUserId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'developer_role_missing' }, { status: 500 });
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
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
    }

    const developerMember = (await developerResponse.json()) as { roles: string[] };
    if (!developerMember.roles.includes(developerRoleId)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Developer access check error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}