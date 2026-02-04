import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ guildId: string; userId: string }> }
) {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const { guildId, userId } = await params;

    // Discord API'den kullanıcının sunucudaki rollerini al
    const response = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch member' }, { status: response.status });
    }

    const member = await response.json();

    return NextResponse.json({
      id: member.user.id,
      username: member.user.username,
      avatar: member.user.avatar ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png` : null,
      roles: member.roles,
    });
  } catch (error) {
    console.error('Error fetching Discord guild member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}