import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const { guildId } = await params;

    // Cookie'den user ID'yi al
    const cookies = request.headers.get('cookie') || '';
    const userIdMatch = cookies.match(/discord_user_id=([^;]+)/);
    const userId = userIdMatch ? userIdMatch[1] : null;

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Discord API'den kullanıcının sunucuda üye olup olmadığını kontrol et
    const memberResponse = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (memberResponse.ok) {
      // Kullanıcı sunucuda üye
      return NextResponse.json({ isMember: true });
    } else if (memberResponse.status === 404) {
      // Kullanıcı sunucuda üye değil
      return NextResponse.json({ isMember: false });
    } else {
      // Diğer hata durumları
      console.error(`Unexpected response status: ${memberResponse.status}`);
      return NextResponse.json({ error: 'Failed to check membership' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error checking guild membership:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}