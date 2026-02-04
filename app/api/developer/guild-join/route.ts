import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Developer access kontrolü
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const discordUserId = cookieStore.get('discord_user_id')?.value;

    if (!discordUserId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const developerRoleId = process.env.DEVELOPER_ROLE_ID ?? '1467580199481639013';
    const developerGuildId = process.env.DEVELOPER_GUILD_ID ?? process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

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

    // İsteği parse et
    const body = await request.json().catch(() => ({}));
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Kullanıcıyı destek sunucusuna ekle
    const addMemberResponse = await fetch(
      `https://discord.com/api/guilds/${developerGuildId}/members/${userId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: 'dummy', // Bot invite için gerekli değil
        }),
      },
    );

    if (addMemberResponse.status === 201) {
      return NextResponse.json({ status: 'joined' });
    }

    if (addMemberResponse.status === 204) {
      return NextResponse.json({ status: 'already_member' });
    }

    const errorData = await addMemberResponse.json().catch(() => ({}));
    console.error('Failed to add member:', errorData);
    return NextResponse.json({ error: 'failed_to_join' }, { status: 500 });
  } catch (error) {
    console.error('Error in guild-join:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}