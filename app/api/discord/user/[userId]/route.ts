import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const { userId } = await params;

    // Discord API'den kullanıcı bilgilerini al
    const response = await fetch(`https://discord.com/api/users/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: response.status });
    }

    const user = await response.json();

    return NextResponse.json({
      id: user.id,
      username: user.username,
      avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null,
    });
  } catch (error) {
    console.error('Error fetching Discord user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}